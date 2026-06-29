# 极寒末世 Codex 项目说明

## 项目定位

这是《极寒末世》的 Codex 工作副本，来源于桌面项目：

`C:\Users\QI CHU\Desktop\Projects\极寒末世`

当前 Codex 项目根目录：

`C:\Users\QI CHU\Documents\Codex\2026-05-30\new-chat-2\极寒末世`

后续开发、检查、修复优先在本目录内进行，避免直接改桌面原项目。

## 主工程

Cocos Creator 工程位于：

`game\NewProject1`

Cocos Creator 版本：

`3.8.8`

入口场景：

`game\NewProject1\assets\main.scene`

主要脚本：

- `game\NewProject1\assets\scripts\GameManagerComp.ts`
- `game\NewProject1\assets\scripts\core\GameManager.ts`
- `game\NewProject1\assets\scripts\core\BuildManager.ts`
- `game\NewProject1\assets\scripts\core\LongTermManager.ts`
- `game\NewProject1\assets\scripts\core\WorldManager.ts`
- `game\NewProject1\assets\scripts\core\OutpostManager.ts`
- `game\NewProject1\assets\scripts\core\ProductionManager.ts`
- `game\NewProject1\assets\scripts\core\ScavengeManager.ts`
- `game\NewProject1\assets\scripts\core\SurvivorManager.ts`
- `game\NewProject1\assets\scripts\core\TemperatureManager.ts`
- `game\NewProject1\assets\scripts\data\interfaces.ts`

## 运行方式

用 Cocos Creator 打开：

`C:\Users\QI CHU\Documents\Codex\2026-05-30\new-chat-2\极寒末世\game\NewProject1`

然后在 Cocos Creator 里运行预览。

如果预览已启动，默认本地地址通常是：

`http://127.0.0.1:7456/`

## 静态检查

在 `game\NewProject1` 目录运行：

```powershell
& 'C:\Users\QI CHU\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' 'C:\ProgramData\cocos\editors\Creator\3.8.8\resources\resources\3d\engine\node_modules\typescript\bin\tsc' --noEmit --pretty false --skipLibCheck --lib ES2019,DOM
```

说明：

- `--skipLibCheck` 用于过滤 Cocos 自带声明文件噪音。
- `--lib ES2019,DOM` 用于支持 `Object.entries`、`Array.flat`、`includes` 等当前代码使用的 API。

当前检查结果：

`0` 个项目代码 TypeScript 错误。

## 当前已修复问题

本 Codex 副本已修复：

- `BuildManager` 缺失 `hasBoiler()`，导致地热井/科技树逻辑可能报错。
- 炮塔击杀掉落表类型错误。
- 搜刮毒气计时器未声明、未在新搜刮开始时重置。
- 搜刮“发现幸存者”返回对象类型不匹配。
- 基地菜单 tuple 类型和 tooltip 参数不匹配。
- 敌人血条百分比 `string`/`number` 类型混用。
- 系统菜单保存/读取、标题页继续游戏时 `unlocked` 科技解锁状态丢失。
- 读档后 `difficulty` 与 `combat.diffMult` 可能不同步。
- 新增 100 小时长线玩法骨架：聚落等级、长期目标、HUD 提示、基地菜单入口、存档字段。
- 新增世界网络闭环：世界影响力、3 个外部哨站、3 条中期生产链、每日外部产出、世界面板。

## 100 小时长线开发

已新增设计文档：

`设计文档\100小时长线玩法结构.md`

当前已落地第一步骨架：

- `LongTermManager` 计算 Lv1-Lv5 聚落等级。
- 长期目标覆盖第一周、食物循环、供暖、远征、工程、防御、通讯、地下聚落和文明核心。
- HUD 显示当前长线阶段和下一目标。
- 基地菜单新增“长线”面板。
- 存档保存/读取 `longTerm` 状态。
- 世界影响力由搜刮、无线电、哨站建设推进。
- 外部哨站包括旧煤矿、废料回收站、外部温室农场。
- 生产链包括燃料工业、废料工程、聚落农业。

## v1.0 收束入口

已新增 v1.0 完成度面板：

- 游戏内：`基地` → `✅完成度`
- HUD 会显示紧凑 v1 进度行：当前完成百分比 + 下一个待测/待完成项。
- 完成度面板内置 3 个 QA 按钮：`测试包`、`快进7天`、`存读测试`。
- `存档读档可用` 必须在系统菜单成功读取，或执行一次 QA 存读往返后才算完成。
- 代码：
  - `game\NewProject1\assets\scripts\core\CompletionManager.ts`
  - `game\NewProject1\assets\scripts\core\GameManager.ts#getCompletionStatus`
  - `game\NewProject1\assets\scripts\GameManagerComp.ts#showCompletionPanel`

面板会按 P0/P1/P2 显示：

- 第一周闭环
- 基础基地
- 供暖核心
- 搜刮完整流程
- 存档读档
- 载具、通讯、外部哨站、生产链、结局路径

预览控制台提供 QA 辅助入口：

- `window._frostDebug.kit()`：加入 v1 测试资源包。
- `window._frostDebug.days(7)`：快进指定天数。
- `window._frostDebug.roundtrip()`：执行一次存档→读档往返。
- `window._frostDebug.status()`：返回当前完成度对象。
- `window._frostQa('kit' | 'days' | 'roundtrip', arg?)`：完成度面板按钮使用的统一 QA 入口。

## 进度汇报口径

项目级总览文件：

`进度总览.md`

后续每轮完成后按该文件里的模板汇报：

- 本轮完成
- 验证结果
- 整体进度百分比
- 下一步最高优先级

## 注意事项

- 桌面原项目尚未同步这些修复，除非用户明确要求，不要覆盖桌面项目。
- 当前工作区保留了原项目 `.git`，但有大量未提交改动，提交前需要先做专门整理。
- `prototype/` 是早期原型，当前开发重点是 `game/NewProject1`。
- `开发计划.md` 和 `开发日志.md` 是项目阶段记录，继续开发前建议先读。
