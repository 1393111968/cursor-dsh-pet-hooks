# dsh-pet HTTP 接口精简说明

完整契约见桌宠仓库 [`API.md`](https://github.com/PC2005-cloud/dsh-pet/blob/main/API.md) 与 `openapi.yaml`。

## 基址

```
http://127.0.0.1:<port>/dsh-pet-7340
```

- 独立模式默认端口：`3080`（占用则顺延）
- 仅监听本机，无鉴权，勿暴露公网

## 本桥接用到的接口

| 方法 | 路径 | 作用 |
|---|---|---|
| `GET` | `/state` | 探测服务是否可用；读取当前气泡等状态 |
| `POST` | `/anim?pet=<id>` | 点播动画，body: `{"name":"工作状态-思考冒泡"}` |
| `POST` | `/broadcast?pet=<id>` | 投喂气泡文案，body: `{"text":"Cursor 正在思考"}` |

成功时动作端点返回：`{"ok":true}`。

## 示例

```bash
BASE=http://127.0.0.1:3080/dsh-pet-7340

curl -s "$BASE/state"

curl -s -X POST "$BASE/broadcast?pet=main" \
  -H 'content-type: application/json' \
  -d '{"text":"巡检完毕"}'

curl -s -X POST "$BASE/anim?pet=main" \
  -H 'content-type: application/json' \
  -d '{"name":"工作状态-思考冒泡"}'
```
