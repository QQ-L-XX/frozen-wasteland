# GitHub 发布检查表

## 本地发布前

- [x] TypeScript 静态检查通过。
- [x] P0 一周逻辑烟测通过。
- [x] README 已补充项目介绍、运行方式、QA 入口和路线图。
- [x] v1.0 发布说明已补充。
- [x] `.gitignore` 已忽略 Cocos 缓存、临时目录和嵌套误复制工程。
- [ ] Cocos 预览人工长测 Day 1 到 Day 7。
- [ ] 补至少 2-4 张真实游戏截图。
- [ ] 选择开源许可证或明确保留版权。

## GitHub 仓库设置建议

- 仓库名：`frozen-wasteland` 或 `ji-han-mo-shi`
- 描述：`Cocos Creator survival management game about building a shelter in a frozen apocalypse.`
- Topics：
  - `cocos-creator`
  - `typescript`
  - `survival-game`
  - `management-game`
  - `indie-game`
  - `frozen-wasteland`
- 勾选：README 显示在仓库首页。
- Release tag：`v1.0.0-candidate`

## 推送命令模板

如果已经创建空 GitHub 仓库：

```powershell
git remote add origin https://github.com/<owner>/<repo>.git
git add .
git commit -m "Prepare v1.0 candidate release"
git tag v1.0.0-candidate
git push -u origin main --tags
```

如果默认分支不是 `main`，先确认当前分支：

```powershell
git branch --show-current
```
