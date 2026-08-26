#!/bin/bash

WASLA_ROOT="$HOME/wasla"
API_DIR="$WASLA_ROOT/apps/api"
WEB_DIR="$WASLA_ROOT/apps/web"
BRIDGE_DIR="$WASLA_ROOT/scripts/bridge"
BRIDGE_SESSION_DIR="$BRIDGE_DIR/.session/session-wasla"
HEARTBEAT_FILE="$WASLA_ROOT/.bridge-heartbeat.json"
DB_FILE="$API_DIR/wasla.db"

API_PORT=8000
WEB_PORT=3000
OLLAMA_PORT=11434

API_LOG="/tmp/wasla-api.log"
WEB_LOG="/tmp/wasla-web.log"
BRIDGE_LOG="/tmp/wasla-bridge.log"
OLLAMA_LOG="/tmp/wasla-ollama.log"

API_PID=""
WEB_PID=""
BRIDGE_PID=""
OLLAMA_PID=""
START_TIME=""

R='\033[0;31m'
G='\033[0;32m'
Y='\033[1;33m'
B='\033[0;34m'
P='\033[0;35m'
C='\033[0;36m'
W='\033[1;37m'
DG='\033[1;30m'
NC='\033[0m'
BOLD='\033[1m'

cleanup() {
    echo ""
    echo -e "${Y}  [SHUTDOWN] Stopping all services...${NC}"
    echo ""

    if [ ! -z "$BRIDGE_PID" ] && kill -0 "$BRIDGE_PID" 2>/dev/null; then
        kill "$BRIDGE_PID" 2>/dev/null; wait "$BRIDGE_PID" 2>/dev/null
        echo -e "  ${R}[x]${NC} Bridge stopped"
    fi
    if [ ! -z "$WEB_PID" ] && kill -0 "$WEB_PID" 2>/dev/null; then
        kill "$WEB_PID" 2>/dev/null; wait "$WEB_PID" 2>/dev/null
        echo -e "  ${R}[x]${NC} Frontend stopped"
    fi
    if [ ! -z "$API_PID" ] && kill -0 "$API_PID" 2>/dev/null; then
        kill "$API_PID" 2>/dev/null; wait "$API_PID" 2>/dev/null
        echo -e "  ${R}[x]${NC} Backend stopped"
    fi
    if [ ! -z "$OLLAMA_PID" ] && kill -0 "$OLLAMA_PID" 2>/dev/null; then
        kill "$OLLAMA_PID" 2>/dev/null; wait "$OLLAMA_PID" 2>/dev/null
        echo -e "  ${R}[x]${NC} Ollama stopped"
    fi

    pkill -f "node index.js" 2>/dev/null
    pkill -f "uvicorn main:app" 2>/dev/null
    pkill -f "next dev" 2>/dev/null
    pkill -f "chromium" 2>/dev/null
    pkill -f "chrome-linux" 2>/dev/null
    pkill -f "ollama serve" 2>/dev/null

    fuser -k $API_PORT/tcp 2>/dev/null
    fuser -k $WEB_PORT/tcp 2>/dev/null
    rm -f "$HEARTBEAT_FILE" 2>/dev/null

    echo ""
    echo -e "  ${G}[OK]${NC} All services stopped"
    echo -e "  ${C}Goodbye!${NC}"
    echo ""
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

get_uptime() {
    if [ -z "$START_TIME" ]; then echo "0s"; return; fi
    local now=$(date +%s); local diff=$((now - START_TIME))
    local hours=$((diff / 3600)); local mins=$(((diff % 3600) / 60)); local secs=$((diff % 60))
    if [ $hours -gt 0 ]; then echo "${hours}h ${mins}m ${secs}s"
    elif [ $mins -gt 0 ]; then echo "${mins}m ${secs}s"
    else echo "${secs}s"; fi
}

get_db_counts() {
    if [ -f "$DB_FILE" ]; then
        local contacts=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM contacts;" 2>/dev/null || echo "0")
        local convs=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM conversations;" 2>/dev/null || echo "0")
        local msgs=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM messages;" 2>/dev/null || echo "0")
        echo "$contacts|$convs|$msgs"
    else echo "0|0|0"; fi
}

get_today_stats() {
    if [ -f "$DB_FILE" ]; then
        local today=$(date '+%Y-%m-%d')
        local msgs_today=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM messages WHERE created_at LIKE '${today}%' AND direction='inbound';" 2>/dev/null || echo "0")
        local new_today=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM conversations WHERE created_at LIKE '${today}%';" 2>/dev/null || echo "0")
        local unread=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM conversations WHERE status='new';" 2>/dev/null || echo "0")
        echo "$msgs_today|$new_today|$unread"
    else echo "0|0|0"; fi
}

get_heartbeat_info() {
    if [ -f "$HEARTBEAT_FILE" ]; then
        python3 -c "
import json, time, os
try:
    with open('$HEARTBEAT_FILE') as f:
        data = json.load(f)
    ts = data.get('ts', 0); status = data.get('status', 'unknown'); pid = data.get('pid', 0)
    now = int(time.time()); diff = now - ts
    alive = False
    try:
        if pid and pid > 0: os.kill(pid, 0); alive = True
    except: alive = False
    connected = diff < 25 and status == 'connected' and alive
    if ts > 0:
        import datetime; last = datetime.datetime.fromtimestamp(ts).strftime('%H:%M:%S')
    else: last = 'N/A'
    print(f'{\"CONNECTED\" if connected else \"DISCONNECTED\"}|{last}|{diff}|{pid}|{alive}')
except: print('DISCONNECTED|N/A|0|0|False')
" 2>/dev/null
    else echo "DISCONNECTED|N/A|0|0|False"; fi
}

get_cpu_mem() {
    local cpu=$(top -bn1 2>/dev/null | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1 || echo "0")
    local mem_used=$(free -m 2>/dev/null | awk 'NR==2{printf "%d", $3}' || echo "0")
    local mem_total=$(free -m 2>/dev/null | awk 'NR==2{printf "%d", $2}' || echo "0")
    echo "$cpu|$mem_used|$mem_total"
}

get_process_mem() {
    local pid=$1
    if [ ! -z "$pid" ] && kill -0 "$pid" 2>/dev/null; then
        local mem=$(ps -o rss= -p "$pid" 2>/dev/null | awk '{printf "%.1f", $1/1024}')
        echo "${mem}MB"
    else echo "N/A"; fi
}

draw_bar() {
    local percent=$1; local width=20
    local filled=$(echo "$percent $width" | awk '{printf "%d", ($1/100)*$2}')
    local empty=$((width - filled))
    printf "${G}"; for ((i=0; i<filled; i++)); do printf "█"; done
    printf "${DG}"; for ((i=0; i<empty; i++)); do printf "░"; done
    printf "${NC}"
}

check_ollama_status() {
    curl -s http://localhost:$OLLAMA_PORT/api/tags > /dev/null 2>&1
    if [ $? -eq 0 ]; then echo "RUNNING"; else echo "STOPPED"; fi
}

# ==================== BOOT ====================

clear
echo ""
echo -e "${B}${BOLD}"
echo '    ╦ ╦╔═╗╔═╗╦  ╔═╗'
echo '    ║║║╠═╣╚═╗║  ╠═╣'
echo '    ╚╩╝╩ ╩╚═╝╩═╝╩ ╩'
echo -e "${NC}"
echo -e "    ${W}${BOLD}WhatsApp Management System${NC}"
echo -e "    ${DG}Developer Console v3.0 + AI${NC}"
echo ""
echo -e "    ${P}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

rm -f "$HEARTBEAT_FILE" 2>/dev/null
: > "$API_LOG"; : > "$WEB_LOG"; : > "$BRIDGE_LOG"; : > "$OLLAMA_LOG"

pkill -f "node index.js" 2>/dev/null; pkill -f "uvicorn main:app" 2>/dev/null
pkill -f "next dev" 2>/dev/null; pkill -f "chromium" 2>/dev/null
pkill -f "chrome-linux" 2>/dev/null
fuser -k $API_PORT/tcp 2>/dev/null; fuser -k $WEB_PORT/tcp 2>/dev/null

rm -f "$BRIDGE_SESSION_DIR"/Singleton* 2>/dev/null
rm -f "$BRIDGE_SESSION_DIR"/Default/Singleton* 2>/dev/null

sleep 2

echo -e "    ${C}[1/5]${NC} Starting Ollama AI..."
OLLAMA_STATUS=$(check_ollama_status)
if [ "$OLLAMA_STATUS" = "RUNNING" ]; then
    echo -e "    ${G}  [OK]${NC} Ollama already running on :$OLLAMA_PORT"
else
    ollama serve > "$OLLAMA_LOG" 2>&1 &
    OLLAMA_PID=$!
    sleep 3
    OLLAMA_STATUS=$(check_ollama_status)
    if [ "$OLLAMA_STATUS" = "RUNNING" ]; then
        echo -e "    ${G}  [OK]${NC} Ollama started on :$OLLAMA_PORT"
    else
        echo -e "    ${Y}  [WARN]${NC} Ollama may take longer to start"
    fi
fi

echo -e "    ${C}[2/5]${NC} Starting Backend..."
cd "$API_DIR"; source venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port $API_PORT > "$API_LOG" 2>&1 &
API_PID=$!; sleep 3

echo -e "    ${C}[3/5]${NC} Starting Frontend..."
cd "$WEB_DIR"; pnpm dev > "$WEB_LOG" 2>&1 &
WEB_PID=$!; sleep 3

echo -e "    ${C}[4/5]${NC} Starting Bridge..."
cd "$BRIDGE_DIR"; node index.js > "$BRIDGE_LOG" 2>&1 &
BRIDGE_PID=$!; sleep 5

echo -e "    ${C}[5/5]${NC} Final checks..."
sleep 2

START_TIME=$(date +%s)

# ==================== DASHBOARD ====================

TICK=0

while true; do
    TICK=$((TICK + 1))

    UPTIME=$(get_uptime)
    CURRENT_TIME=$(date '+%H:%M:%S'); CURRENT_DATE=$(date '+%Y-%m-%d')

    IFS='|' read -r CPU MEM_USED MEM_TOTAL <<< "$(get_cpu_mem)"
    IFS='|' read -r CONTACTS CONVS MSGS <<< "$(get_db_counts)"
    IFS='|' read -r MSGS_TODAY NEW_TODAY UNREAD <<< "$(get_today_stats)"
    IFS='|' read -r HB_STATUS HB_LAST HB_DIFF HB_PID HB_ALIVE <<< "$(get_heartbeat_info)"

    API_MEM=$(get_process_mem "$API_PID")
    WEB_MEM=$(get_process_mem "$WEB_PID")
    BR_MEM=$(get_process_mem "$BRIDGE_PID")

    OLLAMA_STATUS=$(check_ollama_status)

    DB_SIZE="N/A"
    if [ -f "$DB_FILE" ]; then DB_SIZE=$(du -h "$DB_FILE" 2>/dev/null | cut -f1); fi

    if [ "$MEM_TOTAL" -gt 0 ] 2>/dev/null; then MEM_PERCENT=$((MEM_USED * 100 / MEM_TOTAL)); else MEM_PERCENT=0; fi

    clear

    echo ""
    echo -e "  ${B}${BOLD}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "  ${B}${BOLD}║${NC}  ${W}${BOLD}WASLA${NC}  ${DG}WhatsApp Management System${NC}  ${DG}|${NC}  ${P}AI Edition${NC}  ${C}v3.0${NC}  ${B}${BOLD}║${NC}"
    echo -e "  ${B}${BOLD}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""

    echo -e "  ${DG}Date:${NC} ${W}$CURRENT_DATE${NC}  ${DG}|${NC}  ${DG}Time:${NC} ${W}$CURRENT_TIME${NC}  ${DG}|${NC}  ${DG}Uptime:${NC} ${G}$UPTIME${NC}  ${DG}|${NC}  ${DG}#${NC}${DG}$TICK${NC}"
    echo ""

    echo -e "  ${W}${BOLD}SERVICES${NC}"
    echo -e "  ${DG}────────────────────────────────────────────────────────────${NC}"

    if kill -0 "$API_PID" 2>/dev/null; then
        echo -e "  ${G}  ● Backend${NC}     ${G}RUNNING${NC}    PID:${W}$API_PID${NC}    Port:${C}$API_PORT${NC}    Mem:${Y}$API_MEM${NC}"
    else echo -e "  ${R}  ○ Backend${NC}     ${R}STOPPED${NC}"; fi

    if kill -0 "$WEB_PID" 2>/dev/null; then
        echo -e "  ${G}  ● Frontend${NC}    ${G}RUNNING${NC}    PID:${W}$WEB_PID${NC}    Port:${C}$WEB_PORT${NC}    Mem:${Y}$WEB_MEM${NC}"
    else echo -e "  ${R}  ○ Frontend${NC}    ${R}STOPPED${NC}"; fi

    if kill -0 "$BRIDGE_PID" 2>/dev/null; then
        echo -e "  ${G}  ● Bridge${NC}      ${G}RUNNING${NC}    PID:${W}$BRIDGE_PID${NC}                  Mem:${Y}$BR_MEM${NC}"
    else echo -e "  ${R}  ○ Bridge${NC}      ${R}STOPPED${NC}"; fi

    if [ "$OLLAMA_STATUS" = "RUNNING" ]; then
        echo -e "  ${G}  ● Ollama AI${NC}   ${G}RUNNING${NC}              Port:${C}$OLLAMA_PORT${NC}    Model:${P}qwen2.5:0.5b${NC}"
    else echo -e "  ${R}  ○ Ollama AI${NC}   ${R}STOPPED${NC}"; fi

    echo ""
    echo -e "  ${W}${BOLD}WHATSAPP${NC}"
    echo -e "  ${DG}────────────────────────────────────────────────────────────${NC}"

    if [ "$HB_STATUS" = "CONNECTED" ]; then
        echo -e "  ${G}  ● Connected${NC}    Heartbeat: ${C}$HB_LAST${NC}  (${G}${HB_DIFF}s ago${NC})  PID:${W}$HB_PID${NC}"
    else echo -e "  ${R}  ○ Disconnected${NC}  Heartbeat: ${DG}$HB_LAST${NC}  (${R}${HB_DIFF}s ago${NC})  PID:${W}$HB_PID${NC}"; fi

    echo ""
    echo -e "  ${W}${BOLD}SYSTEM${NC}"
    echo -e "  ${DG}────────────────────────────────────────────────────────────${NC}"

    printf "  ${DG}  CPU:${NC}  "; draw_bar "${CPU:-0}"; echo -e "  ${W}${CPU:-0}%%${NC}"
    printf "  ${DG}  RAM:${NC}  "; draw_bar "$MEM_PERCENT"; echo -e "  ${W}${MEM_USED}MB${NC}/${DG}${MEM_TOTAL}MB${NC} (${Y}${MEM_PERCENT}%%${NC})"

    echo ""
    echo -e "  ${W}${BOLD}DATABASE${NC}"
    echo -e "  ${DG}────────────────────────────────────────────────────────────${NC}"
    echo -e "  ${DG}  Size:${NC} ${W}$DB_SIZE${NC}  ${DG}Contacts:${NC} ${C}$CONTACTS${NC}  ${DG}Conversations:${NC} ${C}$CONVS${NC}  ${DG}Messages:${NC} ${C}$MSGS${NC}"

    echo ""
    echo -e "  ${W}${BOLD}TODAY${NC}"
    echo -e "  ${DG}────────────────────────────────────────────────────────────${NC}"
    echo -e "  ${DG}  Messages:${NC} ${G}$MSGS_TODAY${NC}  ${DG}New:${NC} ${G}$NEW_TODAY${NC}  ${DG}Unread:${NC} ${Y}$UNREAD${NC}"

    echo ""
    echo -e "  ${W}${BOLD}LINKS${NC}"
    echo -e "  ${DG}────────────────────────────────────────────────────────────${NC}"
    echo -e "  ${C}  http://localhost:$WEB_PORT${NC}              ${DG}(Web)${NC}"
    echo -e "  ${C}  http://localhost:$WEB_PORT/dashboard${NC}    ${DG}(Dashboard)${NC}"
    echo -e "  ${C}  http://localhost:$WEB_PORT/ai${NC}           ${DG}(AI Assistant)${NC}"
    echo -e "  ${C}  http://localhost:$API_PORT/docs${NC}         ${DG}(API Docs)${NC}"

    echo ""
    echo -e "  ${W}${BOLD}BRIDGE LOG${NC}"
    echo -e "  ${DG}────────────────────────────────────────────────────────────${NC}"

    if [ -f "$BRIDGE_LOG" ]; then
        FILTERED_LINES=$(grep -vE '^[[:space:]]*at |^TROUBLESHOOTING|^Node\.js|^Error: Failed to launch' "$BRIDGE_LOG" 2>/dev/null | tail -3)
        if [ -z "$FILTERED_LINES" ]; then echo -e "  ${DG}  No recent events${NC}"
        else
            echo "$FILTERED_LINES" | while IFS= read -r line; do
                if echo "$line" | grep -qi "error"; then echo -e "  ${R}  $line${NC}"
                elif echo "$line" | grep -qi "message\|saved\|sent"; then echo -e "  ${G}  $line${NC}"
                elif echo "$line" | grep -qi "heartbeat\|ready\|connected"; then echo -e "  ${C}  $line${NC}"
                else echo -e "  ${DG}  $line${NC}"; fi
            done
        fi
    else echo -e "  ${DG}  No logs${NC}"; fi

    echo ""
    echo -e "  ${DG}────────────────────────────────────────────────────────────${NC}"
    echo -e "  ${Y}  Press Ctrl+C to stop${NC}"
    echo ""

    sleep 5
done