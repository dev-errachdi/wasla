const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");
const qrcode = require("qrcode-terminal");
const { Client, LocalAuth } = require("whatsapp-web.js");

const DB_PATH = path.resolve(__dirname, "../../apps/api/wasla.db");
const HEARTBEAT_FILE = path.resolve(__dirname, "../../.bridge-heartbeat.json");

console.log("DB PATH:", DB_PATH);
console.log("HEARTBEAT FILE:", HEARTBEAT_FILE);

const db = new Database(DB_PATH);
const sendingNow = new Set();

process.on("uncaughtException", (err) => {
  console.error("uncaughtException:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("unhandledRejection:", err);
});

function toSqlDate(date) {
  return date.toISOString().replace("T", " ").replace("Z", "").split(".")[0];
}

function nowSql() {
  return toSqlDate(new Date());
}

function timestampToSql(ts) {
  if (!ts) return nowSql();
  return toSqlDate(new Date(ts * 1000));
}

function normalizeDigits(value) {
  if (!value) return "";
  return String(value).replace(/[^\d]/g, "");
}

function writeHeartbeat(status = "connected") {
  try {
    const payload = {
      ts: Math.floor(Date.now() / 1000),
      pid: process.pid,
      status,
    };
    fs.writeFileSync(
      HEARTBEAT_FILE,
      JSON.stringify(payload, null, 2),
      "utf8"
    );
  } catch (err) {
    console.warn("heartbeat error:", err.message);
  }
}

function markBridgeStopped() {
  try {
    if (fs.existsSync(HEARTBEAT_FILE)) {
      fs.unlinkSync(HEARTBEAT_FILE);
    }
    console.log("Heartbeat file deleted");
  } catch (err) {
    console.warn("stop heartbeat error:", err.message);
  }
}

async function extractBestPhone(contact, rawPhone) {
  try {
    if (contact && typeof contact.getFormattedNumber === "function") {
      const formatted = await contact.getFormattedNumber();
      const cleaned = normalizeDigits(formatted);
      if (cleaned && cleaned.length >= 8 && cleaned.length <= 16) {
        return cleaned;
      }
    }
  } catch (err) {
    console.warn("extractBestPhone error:", err.message);
  }
  return rawPhone;
}

// ==================== AUTO REPLY ====================

function getAutoReplySettings() {
  try {
    const setting = db
      .prepare("SELECT * FROM auto_reply_settings LIMIT 1")
      .get();
    return setting || null;
  } catch {
    return null;
  }
}

function shouldSendAutoReply(setting, contactId) {
  if (!setting || !setting.enabled) return false;

  const now = new Date();
  const currentHour = now.getHours();

  if (setting.outside_hours_only) {
    const isInsideHours =
      currentHour >= setting.start_hour && currentHour < setting.end_hour;
    if (isInsideHours) return false;
  }

  try {
    const lastAutoReply = db
      .prepare(
        `SELECT created_at FROM messages
         WHERE conversation_id IN (
           SELECT id FROM conversations WHERE contact_id = ?
         )
         AND sender = 'auto_reply'
         ORDER BY created_at DESC
         LIMIT 1`
      )
      .get(contactId);

    if (lastAutoReply) {
      const lastTime = new Date(lastAutoReply.created_at);
      const diffMinutes = (now - lastTime) / (1000 * 60);
      if (diffMinutes < setting.cooldown_minutes) return false;
    }
  } catch {
    // ignore
  }

  return true;
}

async function sendAutoReply(client, waId, conversationId, replyText) {
  try {
    const digits = normalizeDigits(waId);
    if (!digits) return;

    const chats = await client.getChats();
    const chat = chats.find((c) => {
      const chatDigits = normalizeDigits(c.id._serialized || c.id.user || "");
      return (
        chatDigits === digits ||
        chatDigits.endsWith(digits) ||
        digits.endsWith(chatDigits)
      );
    });

    if (!chat) return;

    await chat.sendMessage(replyText);

    const now = nowSql();
    db.prepare(
      `INSERT INTO messages
       (conversation_id, sender, content, message_type, direction, source, created_at)
       VALUES (?, 'auto_reply', ?, 'text', 'outbound', 'auto_reply', ?)`
    ).run(conversationId, replyText, now);

    console.log("Auto reply sent to", waId);
  } catch (err) {
    console.error("Auto reply error:", err.message);
  }
}

// ==================== OUTGOING QUEUE ====================

function getPendingOutgoingMessages() {
  return db
    .prepare(
      `
      SELECT
        m.id,
        m.conversation_id,
        m.content,
        m.message_type,
        m.retry_count,
        c.external_contact_id,
        ct.phone
      FROM messages m
      JOIN conversations c ON c.id = m.conversation_id
      JOIN contacts ct ON ct.id = c.contact_id
      WHERE m.direction = 'outbound'
        AND m.source = 'whatsapp_web'
        AND (m.external_message_id IS NULL OR m.external_message_id = '')
        AND (m.retry_count IS NULL OR m.retry_count < 3)
      ORDER BY m.id ASC
      LIMIT 10
      `
    )
    .all();
}

function markAsSent(messageId, externalId) {
  db.prepare(
    "UPDATE messages SET external_message_id = ? WHERE id = ?"
  ).run(externalId, messageId);
}

function incrementRetry(messageId) {
  try {
    db.prepare(
      "UPDATE messages SET retry_count = COALESCE(retry_count, 0) + 1 WHERE id = ?"
    ).run(messageId);
  } catch {
    // ignore
  }
}

async function ensureColumns() {
  try {
    db.prepare(
      "ALTER TABLE messages ADD COLUMN retry_count INTEGER DEFAULT 0"
    ).run();
  } catch {
    // already exists
  }
}

async function processOutgoingQueue(client) {
  const pending = getPendingOutgoingMessages();

  for (const row of pending) {
    if (sendingNow.has(row.id)) continue;
    sendingNow.add(row.id);

    try {
      const target = row.external_contact_id || row.phone;
      const digits = normalizeDigits(target);

      if (!digits) {
        incrementRetry(row.id);
        sendingNow.delete(row.id);
        continue;
      }

      let sent = null;
      let lastError = null;

      try {
        const chats = await client.getChats();
        const chat = chats.find((c) => {
          const chatDigits = normalizeDigits(
            c.id._serialized || c.id.user || ""
          );
          return (
            chatDigits === digits ||
            chatDigits.endsWith(digits) ||
            digits.endsWith(chatDigits)
          );
        });

        if (chat) {
          sent = await chat.sendMessage(row.content);
        }
      } catch (err) {
        lastError = err;
      }

      if (!sent) {
        try {
          const chatId = `${digits}@c.us`;
          sent = await client.sendMessage(chatId, row.content);
        } catch (err) {
          lastError = err;
        }
      }

      if (sent) {
        const externalId =
          sent?.id?._serialized ||
          sent?.id?.id ||
          `sent-${row.id}-${Date.now()}`;
        markAsSent(row.id, externalId);
        console.log("Sent message #" + row.id);
      } else {
        incrementRetry(row.id);
        console.error("Failed message #" + row.id, lastError?.message);
      }
    } catch (err) {
      incrementRetry(row.id);
      console.error("Error message #" + row.id, err.message);
    } finally {
      sendingNow.delete(row.id);
    }
  }
}

// ==================== WHATSAPP CLIENT ====================

const client = new Client({
  authStrategy: new LocalAuth({
    clientId: "wasla",
    dataPath: path.resolve(__dirname, ".session"),
  }),
  puppeteer: {
    headless: true,
    executablePath: "/usr/bin/chromium",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-software-rasterizer",
      "--no-first-run",
      "--no-zygote",
      "--single-process",
    ],
  },
});

client.on("qr", (qr) => {
  console.log("\nScan this QR:");
  qrcode.generate(qr, { small: true });
});

client.on("loading_screen", (percent, message) => {
  console.log(`Loading: ${percent}% - ${message}`);
});

client.on("authenticated", () => {
  console.log("Session saved");
});

client.on("auth_failure", (msg) => {
  console.error("Auth failure:", msg);
});

client.on("ready", async () => {
  console.log("WhatsApp Bridge ready");
  const state = await client.getState();
  console.log("WhatsApp state:", state);

  await ensureColumns();

  writeHeartbeat("connected");
  setInterval(() => writeHeartbeat("connected"), 10000);

  setInterval(() => {
    processOutgoingQueue(client).catch((err) => {
      console.error("Outgoing queue error:", err);
    });
  }, 3000);
});

client.on("change_state", (state) => {
  console.log("State changed:", state);
});

client.on("disconnected", (reason) => {
  console.warn("Disconnected:", reason);
  markBridgeStopped();
});

client.on("message", async (msg) => {
  try {
    if (msg.fromMe) return;

    const externalMessageId = msg.id?._serialized || null;

    if (externalMessageId) {
      const exists = db
        .prepare("SELECT id FROM messages WHERE external_message_id = ? LIMIT 1")
        .get(externalMessageId);
      if (exists) return;
    }

    const rawPhone = (msg.from || "").split("@")[0];
    const waId = rawPhone.replace(/[^\d]/g, "") || rawPhone;

    const waContact = await msg.getContact();

    const realName =
      waContact?.pushname ||
      waContact?.name ||
      waContact?.shortName ||
      waId;

    const bestPhone = await extractBestPhone(waContact, waId);

    const content = msg.body || "";
    const now = nowSql();
    const msgTime = timestampToSql(msg.timestamp);

    let contact = db
      .prepare("SELECT id, name, phone FROM contacts WHERE phone = ?")
      .get(bestPhone);

    if (!contact) {
      contact = db
        .prepare("SELECT id, name, phone FROM contacts WHERE phone = ?")
        .get(waId);
    }

    if (!contact) {
      const result = db
        .prepare(
          "INSERT INTO contacts (name, phone, created_at) VALUES (?, ?, ?)"
        )
        .run(realName, bestPhone, now);

      contact = {
        id: Number(result.lastInsertRowid),
        name: realName,
        phone: bestPhone,
      };
    } else {
      if (realName && contact.name !== realName) {
        db.prepare("UPDATE contacts SET name = ? WHERE id = ?").run(
          realName,
          contact.id
        );
      }
      if (bestPhone && contact.phone !== bestPhone) {
        db.prepare("UPDATE contacts SET phone = ? WHERE id = ?").run(
          bestPhone,
          contact.id
        );
      }
    }

    let conversation = db
      .prepare(
        "SELECT id FROM conversations WHERE contact_id = ? AND status != 'closed' ORDER BY id DESC LIMIT 1"
      )
      .get(contact.id);

    if (!conversation) {
      const result = db
        .prepare(
          `INSERT INTO conversations 
           (contact_id, status, source, external_contact_id, created_at, updated_at) 
           VALUES (?, 'new', 'whatsapp_web', ?, ?, ?)`
        )
        .run(contact.id, waId, now, now);

      conversation = { id: Number(result.lastInsertRowid) };
    } else {
      db.prepare(
        "UPDATE conversations SET updated_at = ?, external_contact_id = ?, source = 'whatsapp_web' WHERE id = ?"
      ).run(msgTime, waId, conversation.id);
    }

    db.prepare(
      `INSERT INTO messages 
       (conversation_id, sender, content, message_type, direction, source, external_message_id, created_at) 
       VALUES (?, 'customer', ?, 'text', 'inbound', 'whatsapp_web', ?, ?)`
    ).run(conversation.id, content, externalMessageId, msgTime);

    console.log("Message saved |", bestPhone, ":", content);

    // Auto Reply
    const autoReplySettings = getAutoReplySettings();
    if (shouldSendAutoReply(autoReplySettings, contact.id)) {
      setTimeout(async () => {
        await sendAutoReply(
          client,
          waId,
          conversation.id,
          autoReplySettings.reply_text
        );
      }, 2000);
    }

  } catch (err) {
    console.error("Message error:", err.message);
  }
});

process.on("SIGINT", () => {
  markBridgeStopped();
  process.exit(0);
});

process.on("SIGTERM", () => {
  markBridgeStopped();
  process.exit(0);
});

console.log("Starting Wasla Bridge...");
client.initialize();