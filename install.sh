#!/usr/bin/env bash
# Install cursor-dsh-pet-hooks into the current user's Cursor hooks.
# Usage:
#   chmod +x install.sh && ./install.sh
#   ./install.sh --uninstall

set -euo pipefail

UNINSTALL=0
if [[ "${1:-}" == "--uninstall" ]]; then
  UNINSTALL=1
fi

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
SRC_SCRIPT="$PROJECT_ROOT/hooks/dsh-pet-status.mjs"
CURSOR_DIR="${HOME}/.cursor"
HOOKS_DIR="${CURSOR_DIR}/hooks"
DEST_SCRIPT="${HOOKS_DIR}/dsh-pet-status.mjs"
HOOKS_JSON="${CURSOR_DIR}/hooks.json"
MARKER="dsh-pet-status.mjs"

if [[ ! -f "$SRC_SCRIPT" ]]; then
  echo "Missing script: $SRC_SCRIPT" >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js not found in PATH. Install Node.js 18+ then retry." >&2
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required to merge hooks.json safely." >&2
  exit 1
fi

mkdir -p "$HOOKS_DIR"
cp "$SRC_SCRIPT" "$DEST_SCRIPT"
COMMAND="node ${DEST_SCRIPT}"

python3 - "$HOOKS_JSON" "$COMMAND" "$MARKER" "$UNINSTALL" <<'PY'
import json, sys, os

hooks_json, command, marker, uninstall = sys.argv[1:5]
uninstall = uninstall == "1"

events = [
    # sessionStart omitted: fires on new chat open, not real thinking
    "beforeSubmitPrompt",
    "afterAgentThought",
    "preToolUse",
    "postToolUse",
    "postToolUseFailure",
    "afterAgentResponse",
    "beforeShellExecution",
    "beforeMCPExecution",
    "stop",
]
remove_legacy = ["sessionStart"]

cfg = {"version": 1, "hooks": {}}
if os.path.exists(hooks_json):
    with open(hooks_json, "r", encoding="utf-8") as f:
        raw = f.read().strip()
        if raw:
            cfg = json.loads(raw)

cfg.setdefault("version", 1)
cfg.setdefault("hooks", {})

for ev in events:
    old = cfg["hooks"].get(ev, []) or []
    kept = []
    for item in old:
        cmd = str(item.get("command", ""))
        if marker not in cmd:
            kept.append(item)
    if not uninstall:
        entry = {"command": command, "timeout": 5}
        if ev == "beforeSubmitPrompt":
            entry["matcher"] = "UserPromptSubmit"
        kept.append(entry)
    if kept:
        cfg["hooks"][ev] = kept
    elif ev in cfg["hooks"]:
        del cfg["hooks"][ev]

# Strip this project's legacy sessionStart hook (keep other tools' sessionStart)
for ev in remove_legacy:
    old = cfg["hooks"].get(ev, []) or []
    kept = [item for item in old if marker not in str(item.get("command", ""))]
    if kept:
        cfg["hooks"][ev] = kept
    elif ev in cfg["hooks"]:
        del cfg["hooks"][ev]

os.makedirs(os.path.dirname(hooks_json), exist_ok=True)
with open(hooks_json, "w", encoding="utf-8") as f:
    json.dump(cfg, f, ensure_ascii=False, indent=2)
    f.write("\n")
PY

if [[ "$UNINSTALL" == "1" ]]; then
  echo "Uninstalled hook entries from $HOOKS_JSON"
  echo "Script left at $DEST_SCRIPT (delete manually if desired)"
else
  echo "Installed:"
  echo "  script : $DEST_SCRIPT"
  echo "  hooks  : $HOOKS_JSON"
  echo "  node   : $(command -v node)"
  echo
  echo "Next:"
  echo "  1) Keep dsh-pet running (standalone default port 3080)"
  echo "  2) Reload Cursor hooks (restart Cursor if needed)"
  echo "  3) Send a chat message and watch the pet"
fi
