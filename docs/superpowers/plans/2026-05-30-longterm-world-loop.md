# Long-Term World Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the first playable 100-hour mid/late-game loop through world influence, external outposts, and production chains.

**Architecture:** Add focused core managers for world, outposts, and production. Integrate them through `GameManager` for daily ticks, save/load, and inventory effects. Surface the loop through `GameManagerComp` HUD, base menu, world panel, and long-term panel.

**Tech Stack:** Cocos Creator 3.8.8, TypeScript, existing DOM-based UI in `GameManagerComp`.

---

### Task 1: Core Managers

**Files:**
- Create: `game/NewProject1/assets/scripts/core/WorldManager.ts`
- Create: `game/NewProject1/assets/scripts/core/WorldManager.ts.meta`
- Create: `game/NewProject1/assets/scripts/core/OutpostManager.ts`
- Create: `game/NewProject1/assets/scripts/core/OutpostManager.ts.meta`
- Create: `game/NewProject1/assets/scripts/core/ProductionManager.ts`
- Create: `game/NewProject1/assets/scripts/core/ProductionManager.ts.meta`

- [ ] Create `WorldManager` with influence, faction relations, daily drift, and save/load.
- [ ] Create `OutpostManager` with three outpost definitions, build costs, production, safety, maintenance, and save/load.
- [ ] Create `ProductionManager` with chain status summaries based on game context.

### Task 2: GameManager Integration

**Files:**
- Modify: `game/NewProject1/assets/scripts/core/GameManager.ts`
- Modify: `game/NewProject1/assets/scripts/core/LongTermManager.ts`

- [ ] Import and instantiate the three managers.
- [ ] Add `getWorldContext`, `getOutpostStatus`, `getProductionStatus`, and `buildOutpost`.
- [ ] Apply outpost daily production during `dailyTick`.
- [ ] Increase world influence from scavenging, radio signal progress, and built outposts.
- [ ] Save and load `world`, `outposts`, and `production`.
- [ ] Extend long-term goals with network and production-chain goals.

### Task 3: UI Integration

**Files:**
- Modify: `game/NewProject1/assets/scripts/GameManagerComp.ts`

- [ ] Add a base menu `世界` entry.
- [ ] Implement `showWorldPanel`.
- [ ] Add HUD world summary line.
- [ ] Extend `showLongTermPanel` to show network progress and production chain status.

### Task 4: Docs and Verification

**Files:**
- Modify: `CODEX.md`
- Modify: `开发日志.md`

- [ ] Document the new managers and verification command.
- [ ] Add a development log entry.
- [ ] Run the TypeScript check and confirm zero project errors.
