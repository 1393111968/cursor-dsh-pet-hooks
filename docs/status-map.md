# Cursor 事件 ↔ 桌宠状态映射

脚本：`hooks/dsh-pet-status.mjs`

| Hook 事件 | 动画名 | 气泡 |
|---|---|---|
| `sessionStart` | 工作状态-思考冒泡 | Cursor 开始思考 |
| `beforeSubmitPrompt` | 工作状态-思考冒泡 | Cursor 开始思考 |
| `afterAgentThought` | 工作状态-思考冒泡 | Cursor 正在思考 |
| `preToolUse` | 工作状态-忙碌点按 | Cursor 正在干活 |
| `postToolUse` | 工作状态-清点归档 | Cursor 整理结果 |
| `afterAgentResponse` | 工作状态-清点归档 | Cursor 正在回答 |
| `beforeShellExecution` | 工作状态-原地踉步张望 | Cursor 等你确认 |
| `beforeMCPExecution` | 工作状态-原地踉步张望 | Cursor 等你确认 |
| `postToolUseFailure` | 工作状态-垂头叹气冒汗 | Cursor 这一步卡住了 |
| `stop` + `completed` | 工作状态-雀跃庆祝 | Cursor 完成啦 |
| `stop` + `aborted` | 工作状态-原地踉步张望 | Cursor 已中断 |
| `stop` + `error` | 工作状态-垂头叹气冒汗 | Cursor 出错了 |

动画名需存在于桌宠配置的 `animations.events.workStatus`（dsh-pet 默认包已包含以上名称）。

## 节流（防刷屏）

| 键 | 默认间隔 |
|---|---|
| thinking | 2.5s |
| thought | 4s |
| working | 3s |
| result | 4s |
| answer | 4s |
| waiting | 2s |
| error | 2s |
| stop | 1.5s |

同键在间隔内重复触发会被跳过。
