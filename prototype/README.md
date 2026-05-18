# 极寒末世 · 原型开发指南

## 原型目标

跑通最小闭环：**供暖消耗 → 建造墙壁 → 燃料/食物消耗 → 幸存者状态变化**。

不需要 UI、不需要美术、不需要搜刮。控制台输出验证即可。

---

## 项目搭建（Cocos Creator 3.x）

### 1. 创建空项目

- 打开 Cocos Dashboard
- 新建项目 → 选择 `Empty (3D)` 或 `Empty (2D)` 模板
- 项目路径：指向本目录 `prototype/`

### 2. 导入 TypeScript 脚本

将以下文件复制到 `assets/scripts/` 下，保持相同目录结构：

```
assets/scripts/
├── data/
│   └── interfaces.ts          ← 数据接口定义
└── core/
    ├── TemperatureManager.ts  ← 温度模拟
    ├── InventoryManager.ts    ← 库存管理
    └── GameManager.ts         ← 主循环
```

（实际上这些文件已在本目录 `src/` 下，直接复制到 Cocos Creator 项目的 `assets/scripts/` 即可）

### 3. 创建 GameManager 组件

1. 在 Cocos Creator 中新建一个空节点，命名为 `GameManager`
2. 为此节点新建一个 TypeScript 组件 `GameManagerComp`
3. 在 `GameManagerComp.ts` 中：

```typescript
import { _decorator, Component } from 'cc';
import { GameManager } from './core/GameManager';

const { ccclass } = _decorator;

@ccclass('GameManagerComp')
export class GameManagerComp extends Component {
    
    private game: GameManager;
    
    start() {
        this.game = new GameManager();
        console.log('=== 极寒末世 原型启动 ===');
        console.log(`Day 1, 室外 ${this.game.weather.outdoorTemp}°C`);
        console.log(`幸存者: ${this.game.survivors.map(s=>s.name).join(', ')}`);
    }
    
    update(dt: number) {
        this.game.update(dt);
    }
}
```

4. 将 `GameManagerComp` 挂载到 `GameManager` 节点上

### 4. 运行

- 点击 Cocos Creator 的「运行」按钮
- 打开浏览器控制台（F12）
- 观察每日报告输出

### 5. 预期输出

```
=== 极寒末世 原型启动 ===
Day 1, 室外 -28°C
幸存者: 老兵, 技师, 医生

═══ Day 2 ═══
  室外温度: -28°C
  室内温度: 12.3°C
  食物: 28 单位
  燃料: 木材45 + 煤20
  幸存者状态:
    老兵: 健康85 体温72% 士气77%
    技师: 健康90 体温68% 士气64%
    医生: 健康92 体温70% 士气80%

═══ Day 3 ═══
  ...
```

如果室内温度在火盆燃烧时稳定在 10-15°C，燃料和食物逐日递减——就是正确的。

---

## 验证清单

原型通过后，逐一验证以下项：

- [ ] 火盆运行时，周围 4 格温度明显高于室外
- [ ] 火盆燃料耗尽后（无木材），室内温度随时间降至室外温度
- [ ] 墙壁内的格子热损低于墙壁外的格子
- [ ] 食物库存每日递减约 9-12 单位
- [ ] 燃料（木材）每小时消耗 1 单位
- [ ] 幸存者体温在温暖房间内缓慢回升
- [ ] 幸存者营养在食物耗尽后下降

---

## 下一步（原型扩展）

原型验证通过后，按顺序扩展：

1. **建造系统** — 玩家可放置木墙蓝图 → 幸存者自动建造
2. **简易 UI** — 屏幕显示温度、食物、燃料数值
3. **搜刮场景** — 点击按钮 → 切换到小型室内场景 → 搜索物资 → 返回
4. **敌人系统** — 单个冻饿者 AI + 简易战斗
