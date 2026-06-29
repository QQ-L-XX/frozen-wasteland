# 100 Hour World Loop Design

## Goal

Build the first playable mid/late-game loop for the 100-hour direction: the world becomes a network of factions, outposts, and production chains instead of only repeated scavenging.

## Approved Scope

This pass implements the minimal playable loop:

- World influence and faction relations.
- Three external outposts: coal mine, scrap depot, greenhouse farm.
- Daily outpost production with safety, maintenance, and supply pressure.
- Base prerequisites tied to existing systems: workshop, radio, snowmobile, geothermal.
- HUD and long-term panel visibility.
- Save/load support.

This pass does not implement full diplomacy screens, combat missions, quest chains, or challenge scenarios. Those remain later milestones.

## Architecture

The implementation adds three focused core managers:

- `WorldManager`: owns world influence and faction relations.
- `OutpostManager`: owns external outpost unlock/build/upgrade state and daily production.
- `ProductionManager`: owns mid-game production chain summaries and unlock checks.

`GameManager` remains the integration point because current gameplay state already flows through it. UI changes stay inside `GameManagerComp`, following the existing DOM-driven menu and HUD style.

## Player Loop

1. Build workshop, radio, snowmobile, and later geothermal.
2. Raise world influence through scavenging, radio signals, and outpost construction.
3. Unlock external outposts.
4. Invest resources to build outposts.
5. Outposts produce daily resources.
6. Low safety or maintenance reduces output, so the player keeps returning to the world layer.
7. Long-term goals point the player toward a settlement network.

## Data Rules

- Coal mine produces `fuel_coal`.
- Scrap depot produces `mat_metal` and sometimes `part_circuit`.
- Greenhouse farm produces `food_veg`.
- Output is scaled by outpost level, safety, maintenance, and supply.
- Outpost construction consumes existing inventory resources.
- World influence grows from meaningful progression events and daily maintained outposts.

## UI

HUD adds a compact world line after the long-term line:

- World influence.
- Outpost count.
- Daily production summary.

The base menu gains a `世界` entry that opens a compact management panel. The existing `长线` panel also shows network progress.

## Save/Load

Save data gains:

- `world`
- `outposts`
- `production`

Existing saves remain compatible because missing fields load default states.

## Verification

Run the existing Cocos TypeScript check:

```powershell
& 'C:\Users\QI CHU\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' 'C:\ProgramData\cocos\editors\Creator\3.8.8\resources\resources\3d\engine\node_modules\typescript\bin\tsc' --noEmit --pretty false --skipLibCheck --lib ES2019,DOM
```
