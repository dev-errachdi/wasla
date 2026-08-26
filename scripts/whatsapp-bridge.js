const path = require("path");
const fs = require("fs");
const qrcode = require("qrcode-terminal");
const Database = require("better-sqlite3");
const { Client, LocalAuth } = require("whatsapp-web.js");

const ROOT = path.resolve(__dirname, "..");
const DB_PATH = path.join(ROOT, "apps", "api", "wasla.db");
const SESSION_DIR = path.join(ROOT, ".wasla-wa-session");
const SEEN_FILE = path.join(ROOT, ".wasla-wa-seen.json");

if (!fs.existsSync(DB_PATH)) {
  console.error("❌ قاعدة البيانات غير موجودة:");
  console.error(DB_PATH);
  console.error("شغّل backend أولاً حتى ينشئ wasla.db");
  process.exit(1);
}

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("busy_timeout = 5000");

function loadSeenIds() {
  if (!fs.existsSync(SEEN_FILE)) return new Set();
  try {
    const raw = JSON.parse(fs.readFileSync(SEEN_FILE, "utf8"));
    return new Set(raw);
  } catch {
    return new Set();
  }
}

function saveSeenIds(seen) {
  fs.writeFileSync(SEEN_FILE, JSON.stringify([...seen], null, 2), "utf8");
}

const seenIds = loadSeenIds();

function getTableColumns(table) {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all();
  return rows.map((r) => r.name);
}

function hasColumn(table, column) {
  return getTableColumns(table).includes(column);
}

function normalizePhone(jid = "") {
  return jid.split("@")[0].replace(/\D/g, "");
}

function nowIso() {
  return new Date().toISOString();
}

function messageTimeIso(timestamp) {
  if (!timestamp) return nowIso();
  // whatsapp-web.js timestamp غالبًا بالثواني
  return new Date(timestamp * 1000).toISOString();
}

function getOrCreateContact(name, phone) {
  let contact = db
    .prepare(`SELECT id, name, phone FROM contacts WHERE phone = ? LIMIT 1`)
    .get(phone);

  if (contact) {
    if (name && contact.name !== name) {
      db.prepare(`UPDATE contacts SET name = ? WHERE id = ?`).run(name, contact.id);
    }
    return contact.id;
  }

  const cols = ["name", "phone"];
  const vals = [name || phone, phone];

  if (hasColumn("contacts", "created_at")) {
    cols.push("created_at");
    vals.push(nowIso());
  }

  const placeholders = cols.map(() => "?").join(", ");
  const sql = `INSERT INTO contacts (${cols.join(", ")}) VALUES (${placeholders})`;
  const info = db.prepare(sql).run(...vals);

  return Number(info.lastInsertRowid);
}

function getOrCreateConversation(contactId, externalContactId = null) {
  let query = `SELECT id FROM conversations WHERE contact_id = ?`;
  const params = [contactId];

  if (hasColumn("conversations", "status")) {
    query += ` AND status != ?`;
    params.push("closed");
  }

  query += ` ORDER BY id DESC LIMIT 1`;

  const existing = db.prepare(query).get(...params);
  if (existing) return existing.id;

  const cols = ["contact_id"];
  const vals = [contactId];

  if (hasColumn("conversations", "status")) {
    cols.push("status");
    vals.push("new");
  }

  if (hasColumn("conversations", "source")) {
    cols.push("source");
    vals.push("whatsapp_web");
  }

  if (hasColumn("conversations", "external_contact_id")) {
    cols.push("external_contact_id");
    vals.push(externalContactId);
  }

  if (hasColumn("conversations", "created_at")) {
    cols.push("created_at");
    vals.push(nowIso());
  }

  if (hasColumn("conversations", "updated_at")) {
    cols.push("updated_at");
    vals.push(nowIso());
  }

  const placeholders = cols.map(() => "?").join(", ");
  const sql = `INSERT INTO conversations (${cols.join(", ")}) VALUES (${placeholders})`;
  const info = db.prepare(sql).run(...vals);

  return Number(info.lastInsertRowid);
}

function updateConversationTimestamp(conversationId, iso) {
  if (hasColumn("conversations", "updated_at")) {
    db.prepare(`UPDATE conversations SET updated_at = ? WHERE id = ?`).run(
      iso,
      conversationId
    );
  }
}

function insertMessage({
  conversationId,
  sender,
  content,
  messageType,
  createdAt,
  externalMessageId,
  direction,
}) {
  const cols = ["conversation_id", "sender", "content"];
  const vals = [conversationId, sender, content];

  if (hasColumn("messages", "message_type")) {
    cols.push("message_type");
    vals.push(messageType || "text");
  }

  if (hasColumn("messages", "created_at")) {
    cols.push("created_at");
    vals.push(createdAt || nowIso());
  }

  if (hasColumn("messages", "direction")) {
    cols.push("direction");
    vals.push(direction || "inbound");
  }

  if (hasColumn("messages", "source")) {
    cols.push("source");
    vals.push("whatsapp_web");
  }

  if (hasColumn("messages", "external_message_id")) {
    cols.push("external_message_id");
    vals.push(externalMessageId || null);
  }

  const placeholders = cols.map(() => "?").join(", ");
  const sql = `INSERT INTO messages (${cols.join(", ")}) VALUES (${placeholders})`;

  db.prepare(sql).run(...vals);
}

function extractSenderName(contact, msg, phone) {
  return (
    contact?.pushname ||
    contact?.name ||
    msg?._data?.notifyName ||
    phone ||
    "WhatsApp"
  );
}

console.log("🚀 تشغيل Wasla WhatsApp Bridge...");
console.log("📂 DB:", DB_PATH);
console.log("📂 Session:", SESSION_DIR);

const client = new Client({
  authStrategy: new LocalAuth({
    clientId: "wasla",
    dataPath: SESSION_DIR,
  }),
  puppeteer: {
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
    ],
  },
});

client.on("qr", (qr) => {
  console.log("\n📱 امسح هذا QR من واتساب:");
  qrcode.generate(qr, { small: true });
});

client.on("authenticated", () => {
  console.log("✅ تم حفظ جلسة واتساب بنجاح");
});

client.on("ready", () => {
  console.log("✅ WhatsApp Bridge جاهز ويستقبل الرسائل");
});

client.on("auth_failure", (msg) => {
  console.error("❌ فشل المصادقة:", msg);
});

client.on("disconnected", (reason) => {
  console.warn("⚠️ انقطع الاتصال:", reason);
});

client.on("message", async (msg) => {
  try {
    const externalMessageId =
      msg.id?._serialized || msg.id?.id || `fallback-${Date.now()}`;

    if (seenIds.has(externalMessageId)) {
      return;
    }

    const phone = normalizePhone(msg.from);
    const contact = await msg.getContact();
    const senderName = extractSenderName(contact, msg, phone);

    const content = msg.body || `[${msg.type || "unknown"}]`;
    const messageType = msg.type || "text";
    const createdAt = messageTimeIso(msg.timestamp);

    const contactId = getOrCreateContact(senderName, phone);
    const conversationId = getOrCreateConversation(contactId, phone);

    insertMessage({
      conversationId,
      sender: "customer",
      content,
      messageType,
      createdAt,
      externalMessageId,
      direction: "inbound",
    });

    updateConversationTimestamp(conversationId, createdAt);

    seenIds.add(externalMessageId);
    saveSeenIds(seenIds);

    console.log(
      `📩 رسالة جديدة من ${senderName} (${phone}) -> ${content}`
    );
  } catch (error) {
    console.error("❌ خطأ أثناء معالجة الرسالة:", error);
  }
});

client.initialize();
