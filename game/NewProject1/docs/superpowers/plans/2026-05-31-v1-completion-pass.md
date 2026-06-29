# V1 Completion Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the current feature-rich prototype into a clearer v1.0 playable build by adding a completion panel, next-step guidance, and QA helpers.

**Architecture:** Add a small `CompletionManager` that reads existing `GameManager` context and reports v1 readiness/checklist items without changing simulation ownership. Wire the panel into the existing DOM menu system, and add debug helpers guarded behind explicit `window._frostDebug` calls.

**Tech Stack:** Cocos Creator 3.8.8, TypeScript, existing DOM UI.

---

### Task 1: Completion Status Manager

**Files:**
- Create: `assets/scripts/core/CompletionManager.ts`
- Modify: `assets/scripts/core/GameManager.ts`

- [x] Add readiness categories for survival, base, exploration, world, ending, and QA.
- [x] Expose `getCompletionStatus()` from `GameManager`.

### Task 2: Completion Panel

**Files:**
- Modify: `assets/scripts/GameManagerComp.ts`

- [x] Add a `完成度` entry to the base menu.
- [x] Render checklist status, next action, and QA notes in a compact panel.

### Task 3: QA Debug Helpers

**Files:**
- Modify: `assets/scripts/core/GameManager.ts`
- Modify: `assets/scripts/GameManagerComp.ts`

- [x] Add explicit debug helpers to grant a v1 test kit, advance days, and force a save/load roundtrip.
- [x] Expose them only via `window._frostDebug` and a small completion panel note.
- [x] Add in-panel QA buttons for test kit, 7-day fast-forward, and save/load roundtrip.
- [x] Show a compact v1 progress line in HUD and move the character panel below the fixed HUD.

### Task 4: Verification

**Files:**
- No new files.

- [x] Run TypeScript check:

```powershell
& 'C:\Users\QI CHU\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' 'C:\ProgramData\cocos\editors\Creator\3.8.8\resources\resources\3d\engine\node_modules\typescript\bin\tsc' --noEmit --pretty false --skipLibCheck --lib ES2019,DOM
```

- [x] Expected: no TypeScript errors.
