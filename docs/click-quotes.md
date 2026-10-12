# 点击语录（可选增强，与 Hooks 无关）

给 [dsh-pet](https://github.com/PC2005-cloud/dsh-pet) 桌面宠加能力：点击时随机说一句本地语录。

- 不走 LLM，不耗 Token
- 保留原有点击动画，仅多弹一个气泡
- 与 Cursor Hooks 状态联动无关；放在本仓库仅为了多机复用方便

## 安装

1. 确保 dsh-pet 已安装（通常在 `~/.dsh/profiles/web/node_modules/dsh-pet`）
2. 在本仓库根目录执行：

```bash
npm run patch:click-quotes
# 或
node scripts/apply-click-quotes.mjs
```

3. **重启桌面宠物**（或重启 DSH）
4. 点一下宠物，应出现随机语录气泡

## 语录文件

路径：`~/.dsh/dsh-pet/click-quotes.json`

示例见仓库根目录 [`click-quotes.json.example`](../click-quotes.json.example)。

```json
{
  "quotes": [
    "早上好，今天也要充满干劲哦~",
    "点我干嘛？好吧好吧，我在听哦。"
  ]
}
```

下次点击会重新读取该文件（无需改代码）。

## 注意

- 补丁打在 `node_modules` 里，`npm update dsh-pet` 后会被覆盖，需重新执行上述脚本
- 仅针对**桌面 Electron** 端；浏览器 overlay 暂未覆盖
