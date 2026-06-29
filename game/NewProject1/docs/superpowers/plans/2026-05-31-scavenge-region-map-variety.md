# Scavenge Region Map Variety Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make each scavenge region feel visually and mechanically distinct instead of sharing the same random 7x7 layout.

**Architecture:** Keep the existing `ScavengeManager` ownership of grid generation, but replace the single weighted random generator with named region templates plus light random variation. Keep the Cocos UI rendering path intact and add a compact region hint line from the manager.

**Tech Stack:** Cocos Creator 3.8.8, TypeScript, DOM-based game UI.

---

### Task 1: Region Templates

**Files:**
- Modify: `assets/scripts/core/ScavengeManager.ts`

- [ ] Add a region template table with one or more 7x7 string maps for each region. Each map uses existing cell codes only: `空`, `货`, `敌`, `墟`, `冰`, `门`.
- [ ] Add `getRegionHint(region)` so UI can display one compact identity line.
- [ ] Rewrite `initGrid()` to pick a template, copy it into `grid`, lightly randomize some non-critical cells, guarantee one entrance at bottom center, and preserve the path fallback.

### Task 2: UI Hint

**Files:**
- Modify: `assets/scripts/GameManagerComp.ts`

- [ ] In the scavenge scene header, render the hint from `game.scavenge.getRegionHint(s.region)`.
- [ ] Keep it short and low contrast so it does not crowd the map.

### Task 3: Verification

**Files:**
- No new files.

- [ ] Run TypeScript check:

```powershell
& 'C:\Users\QI CHU\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' 'C:\ProgramData\cocos\editors\Creator\3.8.8\resources\resources\3d\engine\node_modules\typescript\bin\tsc' --noEmit --pretty false --skipLibCheck --lib ES2019,DOM
```

- [ ] Expected: no TypeScript errors.
