/**
 * TemperatureManager — 温度与热力系统
 * 原型阶段：基于网格的热扩散简化模拟
 */

import { BaseCell, BuildingType, WeatherState } from '../data/interfaces';

export class TemperatureManager {
    
    private grid: BaseCell[][] = [];
    private width: number = 0;
    private height: number = 0;
    private weather: WeatherState;
    
    // 热力参数（来自设计文档）
    private readonly HEAT_OUTPUT = {
        [BuildingType.FACILITY_FIREPIT]: 5,    // 火盆 5/秒
        [BuildingType.FACILITY_COALSTOVE]: 15, // 煤炉 15/秒
    };
    
    private readonly INSULATION_RATE = {
        [BuildingType.WALL_WOOD]: 0.4,
        [BuildingType.FLOOR_WOOD]: 0.0,
    };
    
    private readonly THERMAL_DIFFUSION = 0.01;   // 相邻格传导系数
    private readonly HEAT_LOSS_BASE = 0.005;     // 基础热损系数
    
    constructor(weather: WeatherState) {
        this.weather = weather;
    }
    
    /** 设置网格引用 */
    setGrid(grid: BaseCell[][]): void {
        this.grid = grid;
        this.height = grid.length;
        this.width = grid[0]?.length ?? 0;
    }
    
    /** 更新天气 */
    updateWeather(weather: WeatherState): void {
        this.weather = weather;
    }
    
    /**
     * 每帧调用：推进热力模拟一步
     * @param dt 帧间隔（秒）
     */
    tick(dt: number): void {
        if (!this.grid.length) return;
        
        // 第一步：施加热源
        this.applyHeatSources(dt);
        
        // 第二步：热扩散
        this.diffuse(dt);
        
        // 第三步：热损
        this.applyHeatLoss(dt);
    }
    
    /** 对每个格子施加热源供热 */
    private applyHeatSources(dt: number): void {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const cell = this.grid[y][x];
                if (!cell.building || !cell.building.built) continue;
                
                const type = cell.building.type;
                const output = this.HEAT_OUTPUT[type];
                if (output) {
                    // 热源输出向自身和周围格扩散
                    const radius = type === BuildingType.FACILITY_FIREPIT ? 4 : 6;
                    this.radiateHeat(x, y, output * dt, radius);
                }
            }
        }
    }
    
    /** 从 (cx,cy) 向半径 r 内的格子辐射热量 */
    private radiateHeat(cx: number, cy: number, amount: number, radius: number): void {
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const x = cx + dx;
                const y = cy + dy;
                if (x < 0 || x >= this.width || y < 0 || y >= this.height) continue;
                
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > radius) continue;
                
                // 距离衰减：线性
                const falloff = 1 - dist / (radius + 1);
                this.grid[y][x].temperature += amount * falloff;
            }
        }
    }
    
    /** 热扩散：每个格子向邻格均值趋近 */
    private diffuse(dt: number): void {
        const newTemps: number[][] = [];
        for (let y = 0; y < this.height; y++) {
            newTemps[y] = [];
            for (let x = 0; x < this.width; x++) {
                const neighbors = this.getNeighborTemps(x, y);
                const avg = neighbors.reduce((a, b) => a + b, 0) / neighbors.length;
                // 向均值趋近
                const current = this.grid[y][x].temperature;
                newTemps[y][x] = current + (avg - current) * this.THERMAL_DIFFUSION * dt * 60;
            }
        }
        // 应用新温度
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                this.grid[y][x].temperature = newTemps[y][x];
            }
        }
    }
    
    /** 热损：每个格子向室外温度流失热量 */
    private applyHeatLoss(dt: number): void {
        const outdoor = this.weather.outdoorTemp;
        
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const cell = this.grid[y][x];
                
                // 计算保温率
                let insulation = 0;
                if (cell.building?.built) {
                    insulation = this.INSULATION_RATE[cell.building.type] ?? 0;
                }
                
                const lossRate = (1 - insulation) * this.HEAT_LOSS_BASE;
                const delta = (cell.temperature - outdoor) * lossRate * dt * 60;
                cell.temperature -= delta;
            }
        }
    }
    
    /** 获取指定格的邻格温度列表 */
    private getNeighborTemps(x: number, y: number): number[] {
        const temps: number[] = [];
        // 四个方向的邻居（如果有墙阻挡则跳过 — 原型简化：不检查墙）
        const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];
        for (const [dx, dy] of dirs) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
                temps.push(this.grid[ny][nx].temperature);
            }
        }
        // 包括自身
        temps.push(this.grid[y][x].temperature);
        return temps;
    }
    
    /** 获取指定格子的温度状态描述 */
    getTemperatureStatus(temp: number): string {
        if (temp >= 15) return '舒适';
        if (temp >= 5) return '可接受';
        if (temp >= -5) return '寒冷';
        if (temp >= -20) return '严寒';
        if (temp >= -40) return '极寒';
        return '致命';
    }
}
