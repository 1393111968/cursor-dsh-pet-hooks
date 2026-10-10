# cursor-dsh-pet-hooks

把 **Cursor Agent** 的思考 / 干活 / 等待确认 / 完成等状态，实时映射到 [dsh-pet](https://github.com/PC2005-cloud/dsh-pet) 桌面宠物。

```
Cursor Hooks  →  dsh-pet-status.mjs  →  POST /anim + /broadcast  →  桌宠动画 & 气泡
```

>桌宠本身只原生对接 DSH 会话事件；本仓库用 Cursor 官方 Hooks + 桌宠本机 HTTP 接口做桥接。

---

## 最快安装（推荐）

1. 先保证 [dsh-pet](https://github.com/PC2005-cloud/dsh-pet) 已在本机运行（独立模式默认端口 `3080`）
2. 复制**本仓库地址**，粘贴发给你的 Cursor Agent，让它帮你安装

可直接拷贝下面这段：

```text
请帮我安装这个 Cursor + dsh-pet 状态联动仓库：
https://github.com/1393111968/cursor-dsh-pet-hooks

要求：
1. clone 到本地（或打开已有目录）
2. Windows 运行 install.ps1；macOS/Linux 运行 install.sh
3. 确认 dsh-pet 已在跑（默认 http://127.0.0.1:3080/dsh-pet-7340/state 可访问）
4. 用 node scripts/demo-states.mjs 或发一条 Agent 消息测试桌宠是否跟状态
```

>也可以只把仓库链接丢给 Cursor，说一句「按 README 帮我安装」即可。

不想用 Agent 时，看下面的手动安装步骤。

---

## 效果

| Cursor 事件 | 桌宠动画 | 气泡文案 |
|---|---|---|
| 提交问题 / 开会话 | 工作状态-思考冒泡 | Cursor 开始思考 |
| 思考结束 | 工作状态-思考冒泡 | Cursor 正在思考 |
| 调用工具前 | 工作状态-忙碌点按 | Cursor 正在干活 |
| 工具完成 / 回答中 | 工作状态-清点归档 | Cursor 整理结果 / 正在回答 |
| 终端或 MCP 待你点允许 | 工作状态-原地踉步张望 | Cursor 等你确认 |
| 本轮完成 | 工作状态-雀跃庆祝 | Cursor 完成啦 |
| 失败 / 出错 | 工作状态-垂头叹气冒汗 | Cursor 卡住了 / 出错了 |

>对话里的选项卡、Ask 选择题等，Cursor 目前没有对应 Hook，**无法**可靠联动。  
>「等你确认」目前覆盖的是 **Shell / MCP 权限确认**（`beforeShellExecution` / `beforeMCPExecution`）。

---

## 前置条件

1. **Node.js 18+**（`node -v` 可用）
2. **Cursor**（支持 Hooks；用户级配置目录为 `~/.cursor/`）
3. **dsh-pet 已运行**，并监听本机 HTTP  
   - 独立模式默认：`http://127.0.0.1:3080/dsh-pet-7340`  
   - 也可挂在 DSH Web 端口下的同一前缀  
   - 桌宠项目：[PC2005-cloud/dsh-pet](https://github.com/PC2005-cloud/dsh-pet)  
   - 接口说明见桌宠仓库 `API.md`（本仓库 `docs/api-overview.md` 有精简摘录）

快速确认桌宠接口：

```bash
curl -s http://127.0.0.1:3080/dsh-pet-7340/state
```

---

## 安装

### Windows

在仓库根目录执行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\install.ps1
```

脚本会：

1. 复制 `hooks/dsh-pet-status.mjs` → `%USERPROFILE%\.cursor\hooks\dsh-pet-status.mjs`
2. **合并**写入 `%USERPROFILE%\.cursor\hooks.json`（保留你已有的其它 hooks）

卸载本项目的 hook 条目（不删其它配置）：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\install.ps1 -Uninstall
```

### macOS / Linux

```bash
chmod +x install.sh
./install.sh
# 卸载：
./install.sh --uninstall
```

### 手动安装

1. 复制 `hooks/dsh-pet-status.mjs` 到 `~/.cursor/hooks/`
2. 参考 `hooks.json.example`，把各事件条目合并进 `~/.cursor/hooks.json`  
   把示例里的 `REPLACE_WITH_ABSOLUTE_PATH` 换成脚本的**绝对路径**
3. 保存后 Cursor 一般会热加载；无效则重启 Cursor

---

## 验证

### 1）手动推一条状态

**Windows PowerShell：**

```powershell
'{"hook_event_name":"beforeShellExecution"}' | node "$env:USERPROFILE\.cursor\hooks\dsh-pet-status.mjs"
```

**bash：**

```bash
echo '{"hook_event_name":"beforeShellExecution"}' | node ~/.cursor/hooks/dsh-pet-status.mjs
```

桌宠应出现「踉步张望」并气泡显示「Cursor 等你确认」。

### 2）轮播六种状态

```bash
npm run test:demo
# 或
node scripts/demo-states.mjs
```

### 3）真实对话

在 Cursor 发一条会调用工具的 Agent 消息，观察桌宠是否切换「思考 → 干活 → 完成」。

调试日志：`~/.cursor/hooks/dsh-pet-status.log`  
成功时会出现类似：`sent anim=... okAnim=true okSay=true`

---

## 配置（可选）

通过环境变量调整（可在系统环境或启动 Cursor 前设置）：

| 变量 | 含义 | 默认 |
|---|---|---|
| `DSH_PET_BASE` | 完整基址，如 `http://127.0.0.1:3080/dsh-pet-7340` | 自动探测 |
| `DSH_PET_PORT` | 优先探测的端口 | 先试 `3080` 等常见端口 |
| `DSH_PET_ID` | 宠物 id | `main` |

运行时缓存文件（可删，会自动重建）：

- `~/.cursor/hooks/dsh-pet-port.txt` — 端口缓存  
- `~/.cursor/hooks/dsh-pet-throttle.json` — 防刷屏节流  
- `~/.cursor/hooks/dsh-pet-status.log` — 调试日志  

---

## 仓库结构

```
cursor-dsh-pet-hooks/
├── README.md                 # 本说明
├── LICENSE                   # MIT
├── package.json
├── install.ps1               # Windows 安装 / 卸载
├── install.sh                # macOS / Linux 安装 / 卸载
├── hooks.json.example        # hooks 配置示例
├── hooks/
│   └── dsh-pet-status.mjs    # Hook 主脚本
├── scripts/
│   └── demo-states.mjs       # 六种状态演示
└── docs/
    ├── api-overview.md       # 桌宠 HTTP 接口精简说明
    └── status-map.md         # 事件 ↔ 动画映射表
```

---

## 工作原理

1. Cursor 在 Agent 生命周期触发 Hooks，把 JSON 事件写入脚本 stdin  
2. `dsh-pet-status.mjs` 解析 `hook_event_name`（兼容 UTF-8 / UTF-16 stdin）  
3. 映射到 dsh-pet 工作状态动画名，调用：  
   - `POST /dsh-pet-7340/anim?pet=<id>`  
   - `POST /dsh-pet-7340/broadcast?pet=<id>`  
4. 桌宠播动画并弹出气泡  
5. 脚本 **fail-open**：桌宠没开也不会卡住 Cursor；带节流，避免工具调用过密时刷屏  

用户级 Hooks 对**所有工作区 / 新对话**生效，无需每个项目单独配置。

---

## 常见问题

**装了没反应？**

1. 确认桌宠接口通：`curl http://127.0.0.1:3080/dsh-pet-7340/state`  
2. 看日志 `~/.cursor/hooks/dsh-pet-status.log` 是否有 `JSON parse fail` / `pet base not found`  
3. 确认 `hooks.json` 里 command 指向的脚本路径存在，且本机 `node` 在 PATH 中  
4. 重启 Cursor  

**气泡中文乱码？**  
请使用本仓库脚本（字符串已用 `\u` 转义）。不要用错误编码保存过的旧 PowerShell 版本。

**会不会拖慢 Cursor？**  
每次调用约几百毫秒量级 HTTP；失败立即放弃；有节流。不会阻断 Agent（权限类 hook 固定返回 `allow`）。

**能否对接多只宠物？**  
设置 `DSH_PET_ID` 为对应 `pets[].id`。

---

## 致谢

- 桌宠：[dsh-pet](https://github.com/PC2005-cloud/dsh-pet)  
- Cursor Hooks 文档：https://cursor.com/docs/hooks  

## License

MIT
