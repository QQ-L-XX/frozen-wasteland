/**
 * GameManager — 原型主循环
 * 串联所有核心系统：时间推进、温度模拟、库存消耗
 * 
 * 用法：在 Cocos Creator 场景中挂载此脚本到根节点
 * 原型阶段不需要 UI，仅控制台输出验证
 */

import { BaseCell, TerrainType, BuildingType, WeatherState, TimeState, Survivor, Trait } from '../data/interfaces';
import { TemperatureManager } from './TemperatureManager';
import { InventoryManager } from './InventoryManager';

export class GameManager {
    
    // 子系统
    public temperature: TemperatureManager;
    public inventory: InventoryManager;
    
    // 世界状态
    public weather: WeatherState;
    public time: TimeState;
    public survivors: Survivor[] = [];
    
    // 基地网格
    public baseGrid: BaseCell[][] = [];
    public readonly BASE_SIZE = 50;
    
    // 运行时计时器
    private gameTimer: number = 0;
    
    constructor() {
        this.weather = {
            outdoorTemp: -28,
            windSpeed: 10,
            snowfall: 0.3,
            isBlizzard: false,
        };
        
        this.time = {
            day: 1,
            hour: 6,
            isPaused: false,
            gameSpeed: 1,
        };
        
        this.temperature = new TemperatureManager(this.weather);
        this.inventory = new InventoryManager();
        
        this.initBaseGrid();
        this.initSurvivors();
        this.initStartingInventory();
        this.temperature.setGrid(this.baseGrid);
    }
    
    /** 初始化基地网格 */
    private initBaseGrid(): void {
        for (let y = 0; y < this.BASE_SIZE; y++) {
            this.baseGrid[y] = [];
            for (let x = 0; x < this.BASE_SIZE; x++) {
                this.baseGrid[y][x] = {
                    x, y,
                    terrain: TerrainType.SNOW,
                    building: null,
                    temperature: this.weather.outdoorTemp,
                };
            }
        }
        
        // 放置初始木棚（3×3 的火盆房）
        const sx = 24, sy = 24;
        for (let dy = 0; dy < 4; dy++) {
            for (let dx = 0; dx < 4; dx++) {
                const cell = this.baseGrid[sy + dy][sx + dx];
                if (dx === 0 || dx === 3 || dy === 0 || dy === 3) {
                    cell.building = { type: BuildingType.WALL_WOOD, built: true, buildProgress: 1, health: 60 };
                }
            }
        }
        // 火盆在中央
        this.baseGrid[sy + 2][sx + 1].building = {
            type: BuildingType.FACILITY_FIREPIT,
            built: true, buildProgress: 1, health: 100,
        };
    }
    
    /** 初始化幸存者 */
    private initSurvivors(): void {
        this.survivors = [
            { id: 1, name: '老兵', strength: 7, intelligence: 5, endurance: 6, perception: 8,
              health: 85, nutrition: 95, bodyTemp: 60, morale: 78, fatigue: 20, frostbite: 0,
              position: { x: 26, y: 26 }, trait: Trait.BRAVE },
            { id: 2, name: '技师', strength: 5, intelligence: 8, endurance: 4, perception: 4,
              health: 90, nutrition: 90, bodyTemp: 55, morale: 65, fatigue: 30, frostbite: 5,
              position: { x: 27, y: 25 }, trait: Trait.HARDWORKING },
            { id: 3, name: '医生', strength: 3, intelligence: 7, endurance: 5, perception: 6,
              health: 92, nutrition: 88, bodyTemp: 58, morale: 81, fatigue: 15, frostbite: 0,
              position: { x: 25, y: 27 }, trait: Trait.OPTIMISTIC },
        ];
    }
    
    /** 初始物资 */
    private initStartingInventory(): void {
        this.inventory.add('food_can', 15);
        this.inventory.add('food_bread', 10);
        this.inventory.add('food_meat_frozen', 5);
        this.inventory.add('fuel_wood', 50);
        this.inventory.add('fuel_coal', 20);
        this.inventory.add('mat_wood', 30);
        this.inventory.add('mat_metal', 15);
        this.inventory.add('mat_insulation', 10);
    }
    
    /**
     * 主循环 — 需要在 Cocos Creator 的 update(dt) 中调用
     * @param dt 真实时间增量（秒）
     */
    update(dt: number): void {
        if (this.time.isPaused) return;
        
        const gameDt = dt * this.time.gameSpeed;
        this.gameTimer += gameDt;
        
        // 温度模拟 (每 0.1 秒游戏时间推进一次)
        this.temperature.tick(gameDt);
        
        // 更新幸存者体温（基于所在格子的温度）
        this.updateSurvivorTemps(gameDt);
        
        // 游戏时间推进 (简化：1秒真实时间 = 1分钟游戏时间 × 速度)
        this.time.hour += gameDt / 60; // 每真实秒 = 1游戏分钟
        
        // 每小时处理
        if (this.gameTimer >= 60) {
            this.onHourPassed();
            this.gameTimer -= 60;
        }
        
        // 每天处理
        if (this.time.hour >= 24) {
            this.time.hour -= 24;
            this.time.day++;
            this.onDayPassed();
        }
    }
    
    /** 幸存者体温更新 */
    private updateSurvivorTemps(gameDt: number): void {
        for (const s of this.survivors) {
            const { x, y } = s.position;
            if (x >= 0 && x < this.BASE_SIZE && y >= 0 && y < this.BASE_SIZE) {
                const cellTemp = this.baseGrid[y][x].temperature;
                // 在温暖环境 → 体温缓慢恢复；在寒冷环境 → 体温下降
                const delta = (cellTemp - (-15)) * 0.1 * gameDt;
                s.bodyTemp = Math.max(0, Math.min(100, s.bodyTemp + delta));
            }
        }
    }
    
    /** 每小时触发 */
    private onHourPassed(): void {
        // 食物消耗
        const foodPerHour = this.survivors.length * 0.15; // 约 3.6/天/人
        const foodEaten = this.inventory.remove('food_can', foodPerHour);
        if (foodEaten < foodPerHour) {
            // 不够吃 → 营养下降
            for (const s of this.survivors) {
                s.nutrition = Math.max(0, s.nutrition - 2);
            }
        }
        
        // 燃料消耗（火盆每小时消耗 1 木材）
        this.inventory.remove('fuel_wood', 1);
        
        // 疲劳累积
        for (const s of this.survivors) {
            s.fatigue = Math.min(100, s.fatigue + 2);
        }
    }
    
    /** 每天触发 */
    private onDayPassed(): void {
        // 士气自然衰减
        for (const s of this.survivors) {
            s.morale = Math.max(0, s.morale - 1);
        }
        
        // 食物腐坏
        this.inventory.tickDay(this.weather.outdoorTemp);
        
        // 控制台汇报
        this.printDailyReport();
    }
    
    /** 控制台每日报告 */
    private printDailyReport(): void {
        const roomTemp = this.baseGrid[25][25].temperature.toFixed(1);
        const food = this.inventory.totalFood();
        const wood = this.inventory.get('fuel_wood');
        const coal = this.inventory.get('fuel_coal');
        
        console.log(`\n═══ Day ${this.time.day} ═══`);
        console.log(`  室外温度: ${this.weather.outdoorTemp}°C`);
        console.log(`  室内温度: ${roomTemp}°C`);
        console.log(`  食物: ${food} 单位`);
        console.log(`  燃料: 木材${wood} + 煤${coal}`);
        console.log(`  幸存者状态:`);
        for (const s of this.survivors) {
            console.log(`    ${s.name}: 健康${s.health} 体温${s.bodyTemp}% 士气${s.morale}%`);
        }
    }
}
