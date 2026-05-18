import { _decorator, Component, Label, Node, Color, find, Graphics } from 'cc';
const { ccclass } = _decorator;

// ============================================
// 类型定义
// ============================================
const TerrainType = { SNOW: 'snow', PERMAFROST: 'permafrost', ROCK: 'rock', ICE_CRACK: 'ice_crack' } as const;
const BuildingType = {
    WALL_WOOD: 'wall_wood', FLOOR_WOOD: 'floor_wood', DOOR_WOOD: 'door_wood',
    FACILITY_FIREPIT: 'facility_firepit', FACILITY_COALSTOVE: 'facility_coalstove',
    BED_MATTRESS: 'bed_mattress', STORAGE_SHELF: 'storage_shelf', PIPE: 'pipe',
} as const;
interface BaseCell { x: number; y: number; terrain: string; building: any; temperature: number; }
interface Survivor { id: number; name: string; strength: number; intelligence: number; endurance: number; perception: number; health: number; nutrition: number; bodyTemp: number; morale: number; fatigue: number; frostbite: number; position: {x:number;y:number}; trait: string; }

// ============================================
// TemperatureManager
// ============================================
class TemperatureManager {
    private grid: BaseCell[][] = [];
    private width = 0; private height = 0;
    private weather = { outdoorTemp: -28, windSpeed: 10, snowfall: 0.3, isBlizzard: false };
    private readonly HEAT_OUTPUT: any = { facility_firepit: 5, facility_coalstove: 15 };
    private readonly INSULATION_RATE: any = { wall_wood: 0.4, floor_wood: 0.0, pipe: 0.25 };
    setGrid(grid: BaseCell[][]) { this.grid = grid; this.height = grid.length; this.width = grid[0]?.length ?? 0; }
    updateWeather(w: any) { this.weather = w; }

    tick(dt: number) {
        if (!this.grid.length) return;
        this.applyHeatSources(dt); this.diffuse(dt); this.applyHeatLoss(dt);
    }
    private applyHeatSources(dt: number) {
        for (let y = 0; y < this.height; y++)
            for (let x = 0; x < this.width; x++) {
                const cell = this.grid[y][x];
                if (!cell.building?.built) continue;
                const o = this.HEAT_OUTPUT[cell.building.type];
                if (o) this.radiateHeat(x, y, o * dt, cell.building.type === BuildingType.FACILITY_FIREPIT ? 4 : 6);
            }
    }
    private radiateHeat(cx: number, cy: number, amount: number, radius: number) {
        for (let dy = -radius; dy <= radius; dy++)
            for (let dx = -radius; dx <= radius; dx++) {
                const x = cx + dx, y = cy + dy;
                if (x < 0 || x >= this.width || y < 0 || y >= this.height) continue;
                const d = Math.sqrt(dx * dx + dy * dy);
                if (d > radius) continue;
                this.grid[y][x].temperature += amount * (1 - d / (radius + 1));
            }
    }
    private diffuse(dt: number) {
        const N = this.height, M = this.width;
        const newT: number[][] = Array.from({length: N}, () => Array(M).fill(0));
        for (let y = 0; y < N; y++)
            for (let x = 0; x < M; x++) {
                let s = 0, c = 0;
                for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
                    const nx = x + dx, ny = y + dy;
                    if (nx >= 0 && nx < M && ny >= 0 && ny < N) { s += this.grid[ny][nx].temperature; c++; }
                }
                s += this.grid[y][x].temperature; c++;
                newT[y][x] = this.grid[y][x].temperature + (s / c - this.grid[y][x].temperature) * 0.01 * dt * 60;
            }
        for (let y = 0; y < N; y++) for (let x = 0; x < M; x++) this.grid[y][x].temperature = newT[y][x];
    }
    private applyHeatLoss(dt: number) {
        const o = this.weather.outdoorTemp;
        for (const row of this.grid)
            for (const cell of row) {
                let ins = 0;
                if (cell.building?.built) ins = this.INSULATION_RATE[cell.building.type] ?? 0;
                cell.temperature -= (cell.temperature - o) * (1 - ins) * 0.005 * dt * 60;
            }
}
    }

// ============================================
// InventoryManager
// ============================================
class InventoryManager {
    private items = new Map<string, number>();
    add(id: string, qty: number) { this.items.set(id, (this.items.get(id) ?? 0) + qty); }
    remove(id: string, qty: number): number { const c = this.items.get(id) ?? 0; const r = Math.min(c, qty); this.items.set(id, c - r); if ((this.items.get(id) ?? 0) <= 0) this.items.delete(id); return r; }
    get(id: string) { return this.items.get(id) ?? 0; }
    totalFood() { return ['food_can', 'food_bread', 'food_meat_frozen'].reduce((s, id) => s + this.get(id), 0); }
}

// ============================================
// GameManager
// ============================================
class GameManager {
    temperature = new TemperatureManager();
    inventory = new InventoryManager();
    weather = { outdoorTemp: -28, windSpeed: 10, snowfall: 0.3, isBlizzard: false };
    time = { day: 1, hour: 6, isPaused: false, gameSpeed: 1 };
    survivors: Survivor[] = [];
    baseGrid: BaseCell[][] = [];
    private readonly SIZE = 50;
    private gameTimer = 0;
    private blizzardCooldown = 0;    // 冷却天数
    private blizzardDaysLeft = 0;    // 剩余持续天数
    private vehicle: string|null = null;
    private greenhouseBuilt = false;
    private greenhouseX = 0;
    private greenhouseY = 0;
    private cropPlanted = false;
    private cropDays = 0;

    /** 建造温室 */
    buildGreenhouse(x: number, y: number) {
        if (this.greenhouseBuilt) { console.log('已有温室'); return; }
        if (this.inventory.get('mat_wood') < 10 || this.inventory.get('mat_glass') < 5 || this.inventory.get('mat_soil') < 3) {
            console.log('需要 木材×10 + 玻璃×5 + 土壤×3'); return;
        }
        this.inventory.remove('mat_wood', 10);
        this.inventory.remove('mat_glass', 5);
        this.inventory.remove('mat_soil', 3);
        this.greenhouseBuilt = true;
        this.greenhouseX = x; this.greenhouseY = y;
        // 在地图上标记
        for (let dy = 0; dy < 3; dy++)
            for (let dx = 0; dx < 3; dx++) {
                const cx = x + dx, cy = y + dy;
                if (cx < this.SIZE && cy < this.SIZE && !this.baseGrid[cy][cx].building)
                    this.baseGrid[cy][cx].building = { type: BuildingType.FLOOR_WOOD, built: true, buildProgress: 1, health: 100 };
            }
        console.log('🌱 温室建造完成！需要 ≥ +2°C 才能种植。输入 game.plant()');
    }

    /** 种植 */
    plant() {
        if (!this.greenhouseBuilt) { console.log('需要先建温室: game.buildGreenhouse(30,30)'); return; }
        const gt = this.baseGrid[this.greenhouseY][this.greenhouseX].temperature;
        if (gt < 2) { console.log(`温室温度 ${gt.toFixed(1)}°C，需要 ≥ +2°C`); return; }
        if (this.cropPlanted) { console.log('已有作物在生长中'); return; }
        this.cropPlanted = true;
        this.cropDays = 0;
        console.log('🌱 已种植耐寒土豆，5天后收获');
    }

    constructor() { this.initGrid(); this.initSurvivors(); this.initInventory(); this.temperature.setGrid(this.baseGrid); }

    private initGrid() {
        for (let y = 0; y < this.SIZE; y++) { this.baseGrid[y] = []; for (let x = 0; x < this.SIZE; x++) this.baseGrid[y][x] = { x, y, terrain: TerrainType.SNOW, building: null, temperature: this.weather.outdoorTemp }; }
        const sx = 24, sy = 24;
        for (let dy = 0; dy < 4; dy++) for (let dx = 0; dx < 4; dx++)
            if (dx === 0 || dx === 3 || dy === 0 || dy === 3) this.baseGrid[sy + dy][sx + dx].building = { type: BuildingType.WALL_WOOD, built: true, buildProgress: 1, health: 60 };
        this.baseGrid[sy + 2][sx + 1].building = { type: BuildingType.FACILITY_FIREPIT, built: true, buildProgress: 1, health: 100 };
    }
    private initSurvivors() {
        this.survivors = [
            { id: 1, name: '老兵', strength: 7, intelligence: 5, endurance: 6, perception: 8, health: 85, nutrition: 95, bodyTemp: 60, morale: 78, fatigue: 20, frostbite: 0, position: { x: 26, y: 26 }, trait: 'brave' },
            { id: 2, name: '技师', strength: 5, intelligence: 8, endurance: 4, perception: 4, health: 90, nutrition: 90, bodyTemp: 55, morale: 65, fatigue: 30, frostbite: 5, position: { x: 27, y: 25 }, trait: 'hardworking' },
            { id: 3, name: '医生', strength: 3, intelligence: 7, endurance: 5, perception: 6, health: 92, nutrition: 88, bodyTemp: 58, morale: 81, fatigue: 15, frostbite: 0, position: { x: 25, y: 27 }, trait: 'optimistic' },
        ];
    }
    private initInventory() {
        this.inventory.add('food_can', 15); this.inventory.add('food_bread', 10); this.inventory.add('food_meat_frozen', 5);
        this.inventory.add('fuel_wood', 50); this.inventory.add('fuel_coal', 20);
        this.inventory.add('mat_wood', 40); this.inventory.add('mat_metal', 15); this.inventory.add('mat_insulation', 10);
    }

    // =====================
    // 公共API — 控制台命令
    // =====================

    /** 放置建造蓝图（AI 会来建造） */
    plan(type: string, x: number, y: number) {
        const recipes: any = {
            wall: { material:'mat_wood', cost:3, building:BuildingType.WALL_WOOD },
            floor: { material:'mat_wood', cost:1, building:BuildingType.FLOOR_WOOD },
            bed: { material:'mat_insulation', cost:3, building:BuildingType.BED_MATTRESS },
            coalstove: { material:'mat_metal', cost:5, building:BuildingType.FACILITY_COALSTOVE },
            shelf: { material:'mat_wood', cost:3, building:BuildingType.STORAGE_SHELF },
        };
        const recipe = recipes[type];
        if (!recipe) { console.log('未知类型。可选: wall, floor, bed, coalstove, shelf'); return; }
        if (x < 0 || x >= this.SIZE || y < 0 || y >= this.SIZE) { console.log('坐标越界'); return; }
        const cell = this.baseGrid[y][x];
        if (cell.building) { console.log('该位置已有建筑'); return; }
        cell.building = { type: recipe.building, built: false, buildProgress: 0, health: 100 };
        // 记录蓝图到队列
        (this as any)._blueprints = (this as any)._blueprints || [];
        (this as any)._blueprints.push({ x, y, material: recipe.material, cost: recipe.cost });
        console.log(`📐 蓝图已放置: ${type} at (${x},${y}) — 等待建造...`);
    }

    /** 铺设管道 */
    pipe(x: number, y: number) {
        if (x < 0 || x >= this.SIZE || y < 0 || y >= this.SIZE) { console.log('坐标越界'); return; }
        if (this.inventory.get('mat_metal') < 1 || this.inventory.get('mat_insulation') < 1) { console.log('需要 金属×1 + 绝缘×1'); return; }
        this.inventory.remove('mat_metal', 1);
        this.inventory.remove('mat_insulation', 1);
        this.baseGrid[y][x].building = { type: BuildingType.PIPE, built: true, buildProgress: 1, health: 100 };
        console.log(`✓ 管道铺设于 (${x},${y})`);
    }

    /** 通用建造（即时） */
    build(type: string, x: number, y: number) {
        const recipes: any = {
            wall: { material:'mat_wood', cost:3, building:BuildingType.WALL_WOOD },
            floor: { material:'mat_wood', cost:1, building:BuildingType.FLOOR_WOOD },
            bed: { material:'mat_insulation', cost:3, building:BuildingType.BED_MATTRESS },
            coalstove: { material:'mat_metal', cost:5, building:BuildingType.FACILITY_COALSTOVE },
            shelf: { material:'mat_wood', cost:3, building:BuildingType.STORAGE_SHELF },
        };
        const recipe = recipes[type];
        if (!recipe) { console.log('未知类型。可选: wall, floor, bed, coalstove, shelf'); return; }
        if (x < 0 || x >= this.SIZE || y < 0 || y >= this.SIZE) { console.log('坐标越界'); return; }
        const cell = this.baseGrid[y][x];
        if (cell.building) { console.log('该位置已有建筑'); return; }
        if (this.inventory.get(recipe.material) < recipe.cost) { console.log(`${recipe.material}不足 (需要${recipe.cost}, 库存${this.inventory.get(recipe.material)})`); return; }
        this.inventory.remove(recipe.material, recipe.cost);
        cell.building = { type: recipe.building, built: true, buildProgress: 1, health: 100 };
        console.log(`✓ ${type} 已建造于 (${x},${y})`);
    }

    /** 建造木墙 */
    wall(x: number, y: number) {
        if (x < 0 || x >= this.SIZE || y < 0 || y >= this.SIZE) { console.log('坐标越界 (0-49)'); return; }
        const cell = this.baseGrid[y][x];
        if (cell.building) { console.log('该位置已有建筑'); return; }
        if (this.inventory.get('mat_wood') < 3) { console.log(`木材不足 (需要3, 库存${this.inventory.get('mat_wood')})`); return; }
        this.inventory.remove('mat_wood', 3);
        cell.building = { type: BuildingType.WALL_WOOD, built: true, buildProgress: 1, health: 60 };
        console.log(`✓ 木墙已建造于 (${x},${y})  剩余木材: ${this.inventory.get('mat_wood')}`);
    }

    /** 建造地板 */
    floor(x: number, y: number) {
        if (x < 0 || x >= this.SIZE || y < 0 || y >= this.SIZE) { console.log('坐标越界'); return; }
        const cell = this.baseGrid[y][x];
        if (cell.building?.type === BuildingType.FLOOR_WOOD) { console.log('已有地板'); return; }
        if (this.inventory.get('mat_wood') < 1) { console.log('木材不足'); return; }
        this.inventory.remove('mat_wood', 1);
        cell.building = { type: BuildingType.FLOOR_WOOD, built: true, buildProgress: 1, health: 100 };
        console.log(`✓ 地板已铺设于 (${x},${y})`);
    }

    /** 批量建造墙壁 (x1,y1 到 x2,y2 矩形边框) */
    wallRect(x1: number, y1: number, x2: number, y2: number) {
        let count = 0;
        const needPer = 3;
        const total = ((Math.abs(x2 - x1) + 1) * 2 + (Math.abs(y2 - y1) - 1) * 2) * needPer;
        if (this.inventory.get('mat_wood') < total) {
            console.log(`木材不足 (需要${total}, 库存${this.inventory.get('mat_wood')})`); return;
        }
        for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
            this.wallQuiet(x, Math.min(y1, y2));
            this.wallQuiet(x, Math.max(y1, y2));
        }
        for (let y = Math.min(y1, y2) + 1; y < Math.max(y1, y2); y++) {
            this.wallQuiet(Math.min(x1, x2), y);
            this.wallQuiet(Math.max(x1, x2), y);
        }
        console.log(`✓ 矩形墙壁建造完成  剩余木材: ${this.inventory.get('mat_wood')}`);
    }
    private wallQuiet(x: number, y: number) {
        if (x < 0 || x >= this.SIZE || y < 0 || y >= this.SIZE) return;
        const cell = this.baseGrid[y][x];
        if (cell.building) return;
        this.inventory.remove('mat_wood', 3);
        cell.building = { type: BuildingType.WALL_WOOD, built: true, buildProgress: 1, health: 60 };
    }

    /** 加燃料 */
    addFuel(amount: number) {
        this.inventory.add('fuel_wood', amount);
        console.log(`✓ 添加木材 ×${amount}  库存: ${this.inventory.get('fuel_wood')}`);
    }

    /** 加材料 */
    addMat(type: string, amount: number) {
        this.inventory.add(type, amount);
        console.log(`✓ 添加 ${type} ×${amount}  库存: ${this.inventory.get(type)}`);
    }

    /** 查看状态 */
    status() {
        const cx = 25, cy = 25;
        console.log('══════════ 基地状态 ══════════');
        console.log(`  Day ${this.time.day} | 室外 ${this.weather.outdoorTemp}°C`);
        console.log(`  基地中心温度: ${this.baseGrid[cy][cx].temperature.toFixed(1)}°C`);
        console.log(`  食物: ${this.inventory.totalFood()} | 木材: ${this.inventory.get('fuel_wood')} | 煤: ${this.inventory.get('fuel_coal')}`);
        console.log(`  建材: 木材${this.inventory.get('mat_wood')} 金属${this.inventory.get('mat_metal')} 绝缘${this.inventory.get('mat_insulation')}`);
    }

    /** 温度热力图 (中心区域 10×10) */
    heatmap() {
        console.log('  热力图 (中心 10×10):');
        let s = '';
        for (let y = 20; y < 30; y++) {
            let row = '  ';
            for (let x = 20; x < 30; x++) {
                const t = this.baseGrid[y][x].temperature;
                if (t >= -5) row += '🔥';
                else if (t >= -10) row += '░';
                else if (t >= -20) row += '▒';
                else row += '▓';
            }
            s += row + '\n';
        }
        console.log(s);
    }

    /** 暂停/继续 */
    togglePause() { this.time.isPaused = !this.time.isPaused; console.log(this.time.isPaused ? '⏸ 已暂停' : '▶ 继续'); }

    // =====================
    // 搜刮系统
    // =====================
    private readonly REGIONS: any = {
        suburb: { name: '郊区住宅', fuel: 1, risk: 1, loot: ['food_can','food_bread','mat_wood','mat_insulation','story_note'] },
        commercial: { name: '商业街', fuel: 3, risk: 2, loot: ['food_can','food_veg','med_bandage','mat_metal','mat_foam','part_battery','part_wire'] },
        hospital: { name: '医院', fuel: 3, risk: 3, loot: ['med_bandage','med_antibiotic','med_frostbite','med_firstaid','story_diary','blueprint_boiler'] },
    };
    private depletion: Record<string,number> = { suburb: 0, commercial: 0, hospital: 0 };
    private scavengeActive = false;
    private scavengeTimer = 0;
    private scavengeRegion = '';
    private scavengeDuration = 5; // 动态
    private aiTimer = 0;

    // =====================
    // 战斗系统
    // =====================
    enemies: { type:string; x:number; y:number; hp:number; maxHp:number }[] = [];
    private combatTimer = 0;

    spawn(type: string, x: number, y: number) {
        const types: any = {
            frozen: { name:'冻饿者', hp:30, maxHp:30 },
            wolf: { name:'变异狼', hp:50, maxHp:50 },
        };
        const t = types[type];
        if (!t) { console.log('未知敌人。可选: frozen, wolf'); return; }
        this.enemies.push({ type, x, y, hp: t.hp, maxHp: t.maxHp });
        console.log(`👹 ${t.name} 出现在 (${x},${y})`);
    }

    private combatTick() {
        if (this.enemies.length === 0) return;
        for (const e of this.enemies) {
            // 找最近的幸存者
            let best: Survivor | null = null, bestD = Infinity;
            for (const s of this.survivors) {
                const d = Math.abs(e.x - s.position.x) + Math.abs(e.y - s.position.y);
                if (d < bestD) { bestD = d; best = s; }
            }
            if (!best) continue;
            // 移动
            if (bestD > 1) {
                if (best.position.x > e.x) e.x++; else if (best.position.x < e.x) e.x--;
                if (best.position.y > e.y) e.y++; else if (best.position.y < e.y) e.y--;
            }
            // 攻击（距离 1 格）
            if (bestD <= 1) {
                const dmg = Math.floor(Math.random() * 6) + 5; // 5-10
                best.health -= dmg;
                if (best.health <= 0) {
                    console.log(`💀 ${best.name} 被击倒了！`);
                    best.health = 0;
                }
            }
        }
        // 幸存者自动反击
        for (const s of this.survivors) {
            const target = this.enemies.find(e =>
                Math.abs(e.x - s.position.x) <= 1 && Math.abs(e.y - s.position.y) <= 1
            );
            if (target && s.health > 0) {
                const dmg = 8 + Math.floor(Math.random() * 5); // 8-12
                target.hp -= dmg;
            }
        }
        // 移除死亡敌人
        const dead = this.enemies.filter(e => e.hp <= 0);
        for (const e of dead) {
            console.log(`⚔ 击杀 ${e.type === 'frozen' ? '冻饿者' : '变异狼'}`);
            if (e.type === 'frozen') { this.inventory.add('mat_insulation', 2); }
            else { this.inventory.add('food_meat_frozen', 2); this.inventory.add('mat_insulation', 3); }
        }
        this.enemies = this.enemies.filter(e => e.hp > 0);
    }

    /** 建造载具 */
    buildVehicle(type: string) {
        const recipes: any = {
            sled: { name:'雪橇', mat_wood:8, mat_metal:4, mat_insulation:3, unlock: ['commercial'] },
            snowmobile: { name:'雪地摩托', mat_metal:15, part_circuit:5, part_motor:1, unlock: ['commercial','hospital'] },
        };
        const r = recipes[type];
        if (!r) { console.log('未知载具。可选: sled, snowmobile'); return; }
        if (this.vehicle === type) { console.log('已拥有此载具'); return; }
        for (const [mat, cost] of Object.entries(r)) {
            if (mat === 'name' || mat === 'unlock') continue;
            if (this.inventory.get(mat) < (cost as number)) { console.log(`${mat}不足 (需要${cost})`); return; }
        }
        for (const [mat, cost] of Object.entries(r)) {
            if (mat === 'name' || mat === 'unlock') continue;
            this.inventory.remove(mat, cost as number);
        }
        this.vehicle = type;
        console.log(`🚛 ${r.name} 建造完成！可探索区域: ${r.unlock.join(', ')}`);
    }

    scavenge(region: string) {
        if (this.scavengeActive) { console.log('已有探索队在外'); return; }
        const r = this.REGIONS[region];
        if (!r) { console.log('未知区域。可选: suburb, commercial, hospital'); return; }
        // 载具限制
        const needVehicle = region === 'hospital' ? 'snowmobile' : region === 'commercial' ? 'sled' : null;
        if (needVehicle && this.vehicle !== needVehicle && this.vehicle !== 'snowmobile') {
            console.log(`需要 ${needVehicle === 'sled' ? '雪橇' : '雪地摩托'} 才能前往 ${r.name}`);
            return;
        }
        if (this.depletion[region] >= 90) { console.log(`${r.name} 已被搜刮殆尽`); return; }
        const fuelCost = this.vehicle === 'snowmobile' ? Math.ceil(r.fuel * 0.5) : r.fuel;
        if (this.inventory.get('fuel_wood') < fuelCost) { console.log(`燃料不足 (需要${fuelCost})`); return; }

        this.inventory.remove('fuel_wood', fuelCost);
        const duration = this.vehicle === 'snowmobile' ? 3 : 5;
        this.scavengeDuration = duration;
        this.scavengeActive = true; this.scavengeTimer = 0; this.scavengeRegion = region;
        console.log(`🔍 探索队出发前往 ${r.name}（消耗燃料 ${fuelCost}，预计 ${duration} 秒）...`);
    }

    scavengeStatus() {
        if (!this.scavengeActive) { console.log('当前无探索任务'); return; }
        const remaining = this.scavengeDuration - this.scavengeTimer;
        console.log(`🔍 探索中... 预计 ${remaining.toFixed(0)} 秒后返回`);
    }

    private scavengeComplete() {
        const region = this.scavengeRegion;
        const r = this.REGIONS[region];
        const pool = r.loot as string[];
        const lootCount = 3 + Math.floor(Math.random() * 4); // 3-6 种物品
        const results: {id:string,qty:number}[] = [];

        // 枯竭度影响收益
        const depletionFactor = 1 - this.depletion[region] / 100;
        const actualCount = Math.max(1, Math.floor(lootCount * depletionFactor));

        for (let i = 0; i < actualCount; i++) {
            const id = pool[Math.floor(Math.random() * pool.length)];
            const qty = Math.floor(Math.random() * 5) + 1;
            this.inventory.add(id, qty);
            results.push({ id, qty });
        }

        this.depletion[region] = Math.min(100, this.depletion[region] + 5 + Math.random() * 15);

        console.log(`\n📦 搜刮完成 — ${r.name}`);
        console.log(`  获得物资:`);
        for (const r of results) console.log(`    ${r.id} ×${r.qty}`);
        console.log(`  枯竭度: ${this.depletion[region].toFixed(0)}%`);
        console.log('');

        this.scavengeActive = false;
    }

    private aiTick() {
        const tech = this.survivors.find(s => s.name === '技师');
        const doc = this.survivors.find(s => s.name === '医生');

        // 技师：找最近的蓝图建造
        if (tech && (this as any)._blueprints?.length > 0) {
            const bps: any[] = (this as any)._blueprints;
            // 找最近的
            let best: any = null, bestDist = Infinity;
            for (const bp of bps) {
                const d = Math.abs(bp.x - tech.position.x) + Math.abs(bp.y - tech.position.y);
                if (d < bestDist) { bestDist = d; best = bp; }
            }
            if (best) {
                // 移动到蓝图位置
                tech.position.x = best.x; tech.position.y = best.y;
                const cell = this.baseGrid[best.y][best.x];
                if (cell.building && !cell.building.built) {
                    // 检查材料
                    if (this.inventory.get(best.material) >= best.cost) {
                        this.inventory.remove(best.material, best.cost);
                        cell.building.built = true;
                        cell.building.buildProgress = 1;
                        const idx = bps.indexOf(best);
                        if (idx >= 0) bps.splice(idx, 1);
                        console.log(`🔨 技师建造完成: (${best.x},${best.y})`);
                    } else {
                        console.log(`⚠ 技师: 材料不足 (${best.material})`);
                    }
                }
            }
        }

        // 医生：治疗最低健康者（不包括自己）
        if (doc) {
            const patient = this.survivors
                .filter(s => s.id !== doc.id && s.health < 90)
                .sort((a, b) => a.health - b.health)[0];
            if (patient) {
                doc.position.x = patient.position.x;
                doc.position.y = patient.position.y;
                patient.health = Math.min(100, patient.health + 5);
                if (patient.health % 20 === 5) // 偶尔提示
                    console.log(`💊 医生治疗了 ${patient.name} (健康${patient.health})`);
            }
        }
    }

    update(dt: number) {
        if (this.time.isPaused) return;

        // ===== 幸存者 AI =====
        this.aiTimer += dt;
        if (this.aiTimer >= 1) { this.aiTimer -= 1; this.aiTick(); this.combatTick(); }

        // 搜刮计时器
        if (this.scavengeActive) {
            this.scavengeTimer += dt;
            if (this.scavengeTimer >= this.scavengeDuration) this.scavengeComplete();
        }

        const gDt = dt * this.time.gameSpeed;
        this.gameTimer += gDt;
        this.temperature.tick(gDt);
        for (const s of this.survivors) {
            const { x, y } = s.position;
            if (x >= 0 && x < this.SIZE && y >= 0 && y < this.SIZE) {
                const t = this.baseGrid[y][x].temperature;
                s.bodyTemp = Math.max(0, Math.min(100, s.bodyTemp + (t + 15) * 0.1 * gDt));
            }
        }
        this.time.hour += gDt * 10;
        if (this.time.hour >= 1) { this.onHour(); this.time.hour -= 1; }
        if (this.time.hour >= 24) { this.time.hour -= 24; this.time.day++; }
        if (this.gameTimer >= 10) { this.onDay(); this.gameTimer -= 10; }
    }
    private onHour() {
        this.inventory.remove('food_can', this.survivors.length * 0.15);
        // 燃料消耗：暴风雪翻倍
        const blizMult = this.weather.isBlizzard ? 2 : 1;
        const hasCoalStove = this.baseGrid.some(row => row.some(c => c.building?.type === BuildingType.FACILITY_COALSTOVE));
        if (hasCoalStove) { this.inventory.remove('fuel_coal', 0.5 * blizMult); this.inventory.remove('fuel_wood', 0.1 * blizMult); }
        else this.inventory.remove('fuel_wood', 1 * blizMult);
        for (const s of this.survivors) s.fatigue = Math.min(100, s.fatigue + 2);
    }
    private onDay() {
        // === 温室作物 ===
        if (this.cropPlanted) {
            const gt = this.baseGrid[this.greenhouseY]?.[this.greenhouseX]?.temperature ?? -28;
            if (gt >= 2) {
                this.cropDays++;
                if (this.cropDays >= 5) {
                    this.inventory.add('food_veg', 8);
                    this.cropPlanted = false;
                    console.log('🌾 土豆成熟！收获 食物×8');
                }
            } else if (gt < -5) {
                this.cropPlanted = false;
                console.log('❄ 作物冻死了（温度过低）');
            }
        }

        // === 暴风雪逻辑 ===
        if (this.blizzardDaysLeft > 0) {
            this.blizzardDaysLeft--;
            if (this.blizzardDaysLeft === 0) {
                this.weather.isBlizzard = false;
                this.weather.outdoorTemp = -28;
                this.weather.snowfall = 0.3;
                this.blizzardCooldown = 2 + Math.floor(Math.random() * 3);
                console.log('🌤 暴风雪结束了');
            }
        } else if (this.blizzardCooldown > 0) {
            this.blizzardCooldown--;
        } else if (Math.random() < 0.3) { // 30%/天触发
            this.weather.isBlizzard = true;
            this.blizzardDaysLeft = 1 + Math.floor(Math.random() * 3); // 1-3天
            this.weather.outdoorTemp = -38 - Math.random() * 15;
            this.weather.snowfall = 0.8;
            console.log(`🌨 暴风雪来袭！持续 ${this.blizzardDaysLeft} 天，室外 ${this.weather.outdoorTemp.toFixed(0)}°C`);
        }

        for (const s of this.survivors) s.morale = Math.max(0, s.morale - 1);
        const t = this.baseGrid[25][25].temperature.toFixed(1);
        const bliz = this.weather.isBlizzard ? ' 🌨暴风雪!' : '';
        console.log(`\n═══ Day ${this.time.day} ═══${bliz}`);
        console.log(`  室外: ${this.weather.outdoorTemp.toFixed(0)}°C | 室内中心: ${t}°C | 食物: ${this.inventory.totalFood()} | 木材: ${this.inventory.get('fuel_wood')}`);
        for (const s of this.survivors) console.log(`  ${s.name}: 健康${s.health} 体温${s.bodyTemp}% 士气${s.morale}%`);
}

}
// ============================================
// Cocos 组件
// ============================================
@ccclass('GameManagerComp')
export class GameManagerComp extends Component {
    private game!: GameManager;
    private label!: Label;
    private gfx!: Graphics;
    private hudTimer = 0;

    start() {
        // 创建 HUD Label（挂在 Canvas 下）
        const canvas = find('Canvas', this.node.scene);
        const parent = canvas ?? this.node;
        const labelNode = new Node('HUD');
        labelNode.setPosition(0, 300, 0);
        this.label = labelNode.addComponent(Label);
        this.label.fontSize = 20;
        this.label.lineHeight = 28;
        this.label.color = new Color(220, 240, 255, 255);
        parent.addChild(labelNode);

        // 创建 Graphics 热力图
        const gfxNode = new Node('Heatmap');
        gfxNode.setPosition(-480, -200, 0);
        this.gfx = gfxNode.addComponent(Graphics);
        parent.addChild(gfxNode);

        this.game = new GameManager();
        (window as any).game = this.game;
        console.log('═══════════════════════════════════');
        console.log('  极寒末世 · 原型 v0.8-final');
        console.log('═══════════════════════════════════');
        console.log('');
        console.log('📟 控制台命令:');
        console.log('  game.plan("wall",20,20)   — 放蓝图(AI来建)');
        console.log('  game.build("wall",25,20)  — 即时建造');
        console.log('  game.build("bed",26,26)   — 建床');
        console.log('  game.build("coalstove",27,25) — 建煤炉');
        console.log('  game.wall(25, 20)        — 同上(快捷)');
        console.log('  game.wallRect(20,20,30,30) — 建矩形房间');
        console.log('  game.buildVehicle("sled")  — 建雪橇(解锁商业街)');
        console.log('  game.buildGreenhouse(30,30)— 建温室');
        console.log('  game.plant()              — 种植(需温室≥2°C)');
        console.log('  game.spawn("frozen",10,25)— 生成冻饿者');
        console.log('  game.scavenge("suburb")   — 探索郊区(5秒返回)');
        console.log('  game.scavenge("hospital") — 探索医院');
        console.log('  game.scavengeStatus()    — 查看探索进度');
        console.log('  game.status()            — 查看状态');
        console.log('  game.heatmap()           — 温度热力图');
        console.log('  game.addFuel(20)         — 加木材');
        console.log('  game.addMat("mat_wood",30)— 加建材');
        console.log('  game.togglePause()       — 暂停/继续');
        console.log('═══════════════════════════');
        console.log('  试试: game.scavenge("suburb")');
        console.log('');
    }
    update(dt: number) {
        if (!this.game) return;
        this.game.update(dt);
        // 每 0.5 秒更新 HUD
        this.hudTimer += dt;
        if (this.hudTimer >= 0.5) {
            this.hudTimer = 0;
            const g = this.game;
            const t = g.baseGrid[25][25].temperature.toFixed(1);
            const bliz = g.weather.isBlizzard ? ' 🌨 暴风雪!' : '';
            this.label.string =
                `Day ${g.time.day}  |  室外 ${g.weather.outdoorTemp.toFixed(0)}°C${bliz}\n` +
                `室内中心 ${t}°C\n` +
                `食物 ${g.inventory.totalFood()}  木材 ${g.inventory.get('fuel_wood')}  煤 ${g.inventory.get('fuel_coal')}`;

            // 绘制热力图色块
            this.drawHeatmap(g);
        }
    }
    private drawHeatmap(g: GameManager) {
        this.gfx.clear();
        const cellSize = 6;
        const grid = g.baseGrid;
        const cx = 22, cy = 22, w = 16; // 画中心 16×16

        for (let dy = 0; dy < w; dy++) {
            for (let dx = 0; dx < w; dx++) {
                const x = cx + dx, y = cy + dy;
                if (y >= grid.length || x >= grid[0].length) continue;
                const cell = grid[y][x];
                const temp = cell.temperature;

                // 温度 → 颜色
                let r: number, gr: number, b: number;
                if (cell.building?.type === 'wall_wood') { r = 100; gr = 70; b = 50; }
                else if (cell.building?.type === 'facility_firepit' || cell.building?.type === 'facility_coalstove') { r = 255; gr = 140; b = 40; }
                else if (cell.building?.type === 'pipe') { r = 150; gr = 150; b = 200; }
                else if (temp >= 0) { r = 255; gr = 180; b = 80; }
                else if (temp >= -10) { r = 140; gr = 180; b = 220; }
                else if (temp >= -20) { r = 80; gr = 130; b = 200; }
                else { r = 40; gr = 70; b = 140; }

                this.gfx.fillColor = new Color(r, gr, b, 255);
                this.gfx.rect(dx * cellSize, dy * cellSize, cellSize, cellSize);
                this.gfx.fill();
            }
        }
    }
}

