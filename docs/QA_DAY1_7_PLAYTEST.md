# v1.0 Day 1-7 长测记录 / Day 1-7 Playtest Log

版本 / Version: `v1.0.0` in progress  
测试目标 / Goal: verify the first-week survival loop in Cocos Preview.

## 中文记录

### 测试前准备

- [ ] 使用 Cocos Creator `3.8.8` 打开 `game/NewProject1`。
- [ ] 运行 `assets/main.scene`。
- [ ] 新开一局，不使用浏览器控制台作弊。
- [ ] 记录难度、开始时间、浏览器/预览地址。
- [ ] 如需复测，先备份或清空浏览器 `localStorage.frost_save`。

### Day 1-7 检查表

| 天数 | 必测动作 | 观察点 | 结果 |
|---|---|---|---|
| Day 1 | 新游戏、查看 HUD、打开建造/仓库/基地/系统菜单 | HUD 不横跳；菜单不互相遮挡；初始资源合理 | 待测 |
| Day 1-2 | 建床、墙/门/地板/管道，尝试煤炉或前置准备 | 材料扣除正确；建造提示清楚；室温变化合理 | 待测 |
| Day 2-3 | 第一次搜刮，测试移动、拾取、战斗、撤离 | 搜刮弹窗稳定；撤离按钮可点；结算准确 | 待测 |
| Day 3-4 | 保存、读档、继续游戏、返回标题再继续 | 资源、蓝图、天气、UI 状态保持一致 | 待测 |
| Day 4-5 | 建工坊、解读蓝图、建温室或煤炉 | 蓝图解锁不丢；温室不覆盖建筑；材料正确 | 待测 |
| Day 5-6 | 第二/第三次搜刮，测试不同区域 | 区域差异明显；搜刮次数不假增加；背包/负重正常 | 待测 |
| Day 7 | 打开 `基地 -> ✅完成度` | P0 项识别准确；风险提示能指导下一步 | 待测 |

### 截图清单

截图建议放到 `docs/assets/screenshots/`。

- [ ] `01-title-or-start.png`：标题/开局界面。
- [ ] `02-base-hud.png`：基地 HUD 和建造区。
- [ ] `03-scavenge-map.png`：搜刮地图。
- [ ] `04-completion-panel.png`：v1.0 完成度面板。

### 问题清单

| 编号 | 严重度 | 位置 | 复现步骤 | 期望 | 实际 | 状态 |
|---|---|---|---|---|---|---|
| P0-001 | P0/P1/P2 | - | - | - | - | 未记录 |

### 通过标准

- [ ] Day 1-7 可不崩溃完成。
- [ ] 至少完成 3 次搜刮。
- [ ] 至少成功保存并读取 1 次。
- [ ] 完成度面板 P0 不出现明显假阳性/假阴性。
- [ ] 没有阻塞继续游戏的 UI 残留、弹窗遮挡或按钮不可点问题。

## English Log

### Setup

- [ ] Open `game/NewProject1` in Cocos Creator `3.8.8`.
- [ ] Run `assets/main.scene`.
- [ ] Start a new game without browser-console cheats.
- [ ] Record difficulty, start time, browser, and preview URL.
- [ ] For retests, back up or clear browser `localStorage.frost_save`.

### Day 1-7 Checklist

| Day | Required Action | What To Watch | Result |
|---|---|---|---|
| Day 1 | Start a new game; inspect HUD and build/storage/base/system menus | HUD is stable; menus do not overlap incorrectly; starting resources feel reasonable | Pending |
| Day 1-2 | Build beds, walls/doors/floors/pipes, and prepare heating | Costs are correct; build feedback is clear; indoor temperature responds | Pending |
| Day 2-3 | First scavenging run: move, loot, fight, evacuate | Scavenge UI is stable; evacuation is clickable; settlement is accurate | Pending |
| Day 3-4 | Save, load, continue, return to title, continue again | Resources, blueprints, weather, and UI state remain consistent | Pending |
| Day 4-5 | Build workshop, interpret blueprints, build greenhouse or coal stove | Blueprint unlocks persist; greenhouse does not overwrite buildings; costs are correct | Pending |
| Day 5-6 | Second/third scavenging runs in different regions | Regions feel different; scavenge count does not inflate; backpack/weight works | Pending |
| Day 7 | Open `Base -> ✅ Completion` | P0 recognition is accurate; risk hints point to useful next steps | Pending |

### Screenshot List

Recommended location: `docs/assets/screenshots/`.

- [ ] `01-title-or-start.png`: title or new-game screen.
- [ ] `02-base-hud.png`: base HUD and build area.
- [ ] `03-scavenge-map.png`: scavenging map.
- [ ] `04-completion-panel.png`: v1.0 completion panel.

### Issue List

| ID | Severity | Area | Repro Steps | Expected | Actual | Status |
|---|---|---|---|---|---|---|
| P0-001 | P0/P1/P2 | - | - | - | - | Not recorded |

### Pass Criteria

- [ ] Day 1-7 can be completed without crashes.
- [ ] At least 3 scavenging runs are completed.
- [ ] At least 1 save/load roundtrip succeeds.
- [ ] The completion panel has no obvious P0 false positives or false negatives.
- [ ] No blocking UI residue, modal overlap, or unclickable button issue prevents continued play.
