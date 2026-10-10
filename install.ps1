# Install cursor-dsh-pet-hooks into the current user's Cursor hooks.
# Usage:
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\install.ps1
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\install.ps1 -Uninstall

param(
  [switch]$Uninstall
)

$ErrorActionPreference = 'Stop'

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$SrcScript = Join-Path $ProjectRoot 'hooks\dsh-pet-status.mjs'
$CursorDir = Join-Path $env:USERPROFILE '.cursor'
$HooksDir = Join-Path $CursorDir 'hooks'
$DestScript = Join-Path $HooksDir 'dsh-pet-status.mjs'
$HooksJson = Join-Path $CursorDir 'hooks.json'

if (-not (Test-Path -LiteralPath $SrcScript)) {
  throw "Missing script: $SrcScript"
}

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
  throw 'Node.js not found in PATH. Install Node.js 18+ then retry.'
}

New-Item -ItemType Directory -Path $HooksDir -Force | Out-Null
Copy-Item -LiteralPath $SrcScript -Destination $DestScript -Force

$scriptPath = ($DestScript -replace '\\', '/')
$command = "node $scriptPath"
$marker = 'dsh-pet-status.mjs'

$events = @(
  # sessionStart intentionally omitted: fires on new chat open, not real thinking
  'beforeSubmitPrompt',
  'afterAgentThought',
  'preToolUse',
  'postToolUse',
  'postToolUseFailure',
  'afterAgentResponse',
  'beforeShellExecution',
  'beforeMCPExecution',
  'stop'
)

# Use Node to merge JSON so single-element arrays stay arrays (PowerShell ConvertFrom-Json unwraps them).
$nodeMerger = @'
const fs = require("fs");
const [hooksJson, command, marker, uninstallFlag] = process.argv.slice(2);
const uninstall = uninstallFlag === "1";
const events = [
  "beforeSubmitPrompt","afterAgentThought","preToolUse","postToolUse",
  "postToolUseFailure","afterAgentResponse","beforeShellExecution","beforeMCPExecution","stop"
];
// Also strip legacy sessionStart entries that mapped to "¿ªÊ¼Ë¼¿¼"
const removeLegacy = ["sessionStart"];

function asArray(v) {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

let cfg = { version: 1, hooks: {} };
if (fs.existsSync(hooksJson)) {
  const raw = fs.readFileSync(hooksJson, "utf8").trim();
  if (raw) cfg = JSON.parse(raw);
}
cfg.version = cfg.version || 1;
cfg.hooks = cfg.hooks || {};

// Normalize every existing hook value to array (repair prior bad installs)
for (const [k, v] of Object.entries(cfg.hooks)) {
  cfg.hooks[k] = asArray(v);
}

for (const ev of events) {
  const kept = asArray(cfg.hooks[ev]).filter((item) => {
    const cmd = String((item && item.command) || "");
    return !cmd.includes(marker);
  });
  if (!uninstall) {
    const entry = { command, timeout: 5 };
    if (ev === "beforeSubmitPrompt") entry.matcher = "UserPromptSubmit";
    kept.push(entry);
  }
  if (kept.length) cfg.hooks[ev] = kept;
  else delete cfg.hooks[ev];
}

// Remove this project's legacy sessionStart hook (keep other tools' sessionStart)
for (const ev of removeLegacy) {
  const kept = asArray(cfg.hooks[ev]).filter((item) => {
    const cmd = String((item && item.command) || "");
    return !cmd.includes(marker);
  });
  if (kept.length) cfg.hooks[ev] = kept;
  else delete cfg.hooks[ev];
}

fs.writeFileSync(hooksJson, JSON.stringify(cfg, null, 2) + "\n", "utf8");
'@

$tmpJs = Join-Path $env:TEMP ("dsh-pet-hooks-merge-" + [guid]::NewGuid().ToString() + ".cjs")
try {
  [System.IO.File]::WriteAllText($tmpJs, $nodeMerger, [System.Text.UTF8Encoding]::new($false))
  $flag = if ($Uninstall) { '1' } else { '0' }
  & node $tmpJs $HooksJson $command $marker $flag
  if ($LASTEXITCODE -ne 0) { throw "hooks.json merge failed (exit $LASTEXITCODE)" }
}
finally {
  Remove-Item -LiteralPath $tmpJs -Force -ErrorAction SilentlyContinue
}

if ($Uninstall) {
  Write-Host "Uninstalled hook entries from $HooksJson"
  Write-Host "Script left at $DestScript (delete manually if desired)"
} else {
  Write-Host "Installed:"
  Write-Host "  script : $DestScript"
  Write-Host "  hooks  : $HooksJson"
  Write-Host "  node   : $($node.Source)"
  Write-Host ""
  Write-Host "Next:"
  Write-Host "  1) Keep dsh-pet running (standalone default port 3080)"
  Write-Host "  2) Reload Cursor hooks (restart Cursor if needed)"
  Write-Host "  3) Send a chat message and watch the pet"
}
