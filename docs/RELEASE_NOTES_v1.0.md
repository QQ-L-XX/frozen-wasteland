# 极寒末世 / Frozen Wasteland v1.0 Candidate 发布说明 / Release Notes

发布日期 / Release date: 2026-06-29

## 中文说明

### 定位

这是《极寒末世》的 `v1.0 Candidate`。版本目标是提供一个可打开、可试玩、可长测、可继续开发的完整功能原型，而不是最终商业发行版。

### 本版重点

- 完成基础生存闭环：温度、食物、燃料、幸存者、建造、搜刮。
- 完成标题、暂停、存档、读档、结局统计等基础游戏流程。
- 深化搜刮系统：8 个区域模板、区域特色、战斗、事件、背包、撤离、结算。
- 加入长期骨架：聚落等级、世界影响力、外部哨站、生产链。
- 加入 v1.0 完成度面板和 QA 工具，方便快速验证 P0/P1/P2。
- 加固存档读档：旧档兼容、坏档提示、外层 UI 字段保留、天气恢复、蓝图解锁保留。

### 已验证

- TypeScript 静态检查通过。
- P0 一周逻辑烟测通过。
- 仓库内置 `tools/qa/run-tsc.ps1` 和 `tools/qa/run-p0-smoke.ps1`，便于发布前复测。
- P0 烟测为非破坏式，运行后不会污染当前局和本地 `frost_save`。
- QA 存读测试会写入并读取本地存档，成功后持久化验证状态。

### 已知限制

- 仍需 Cocos 预览里的人工实机长测。
- 美术、音效、商店页素材和正式发行包尚未完成。
- 100 小时内容量还不足，目前主要是长线骨架。
- README 使用 SVG 预览横幅，真实游戏截图需要后续补充。
- 当前没有配置真实支付、Steam SDK、成就 SDK 或云存档。

### 推荐测试流程

1. Cocos Creator 3.8.8 打开 `game/NewProject1`。
2. 运行入口场景 `assets/main.scene`。
3. 新开一局，从 Day 1 玩到 Day 7。
4. 建造床、温室、工坊、煤炉或锅炉。
5. 完成至少 3 次搜刮，测试撤离和结算。
6. 使用系统菜单保存、读取、返回标题、继续游戏。
7. 打开 `基地 -> ✅完成度`，检查 P0 项是否准确。

### 后续版本方向

- `v1.1`：补中期世界网络和生产链节奏。
- `v1.2`：补长期灾变、幸存者个人线和挑战剧本。
- `v2.0`：面向 80-100 小时目标扩展终局路线与可重复内容。

详细版本计划见 [VERSION_PLAN.md](VERSION_PLAN.md)。

## English

### Positioning

This is the `v1.0 Candidate` build of Frozen Wasteland. The goal of this version is to provide a complete functional prototype that can be opened, played, tested for longer sessions, and developed further. It is not the final commercial release.

### Highlights

- Completed the core survival loop: temperature, food, fuel, survivors, construction, and scavenging.
- Completed the basic game flow: title screen, pause menu, save/load, and ending statistics.
- Expanded scavenging: 8 regional map templates, regional traits, combat, events, backpack management, evacuation, and settlement.
- Added long-term skeleton systems: settlement levels, world influence, external outposts, and production chains.
- Added the v1.0 completion panel and QA tools for fast P0/P1/P2 verification.
- Hardened save/load behavior: old-save compatibility, corrupted-save prompts, preservation of outer UI fields, weather restoration, and blueprint unlock preservation.

### Verified

- TypeScript static check passes.
- P0 first-week logic smoke test passes.
- The repository now includes `tools/qa/run-tsc.ps1` and `tools/qa/run-p0-smoke.ps1` for release verification.
- The P0 smoke test is non-destructive and does not mutate the active game or local `frost_save`.
- The QA save/load test writes and reads a local save, then persists the verification state.

### Known Limitations

- Manual Cocos preview playtesting is still needed.
- Art, audio, store-page assets, and a formal release build are not finished.
- The 100-hour content target is not met yet; this version mainly contains the long-term systems skeleton.
- The README currently uses an SVG preview banner. Real gameplay screenshots should be added later.
- Real payment, Steam SDK, achievement SDK, and cloud saves are not configured.

### Recommended Test Flow

1. Open `game/NewProject1` in Cocos Creator 3.8.8.
2. Run the entry scene `assets/main.scene`.
3. Start a new game and play from Day 1 to Day 7.
4. Build beds, a greenhouse, a workshop, and a coal stove or boiler.
5. Complete at least 3 scavenging runs, including evacuation and settlement.
6. Use the system menu to save, load, return to title, and continue.
7. Open `Base -> ✅ Completion` and verify that P0 items are accurate.

### Next Versions

- `v1.1`: improve mid-game world networking and production-chain pacing.
- `v1.2`: add long-term disasters, survivor personal storylines, and challenge scenarios.
- `v2.0`: expand endings and repeatable content toward the 80-100 hour target.

See the detailed plan in [VERSION_PLAN.md](VERSION_PLAN.md).
