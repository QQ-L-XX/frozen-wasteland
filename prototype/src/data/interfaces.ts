/**
 * 极寒末世 — 原型数据接口
 * 所有核心系统共享的类型定义
 */

// ========== 地块与建筑 ==========

export enum TerrainType {
    SNOW = 'snow',
    PERMAFROST = 'permafrost',
    ROCK = 'rock',
    ICE_CRACK = 'ice_crack',
}

export enum BuildingType {
    WALL_WOOD = 'wall_wood',
    FLOOR_WOOD = 'floor_wood',
    DOOR_WOOD = 'door_wood',
    FACILITY_FIREPIT = 'facility_firepit',
    FACILITY_COALSTOVE = 'facility_coalstove',
    BED_MATTRESS = 'bed_mattress',
    STORAGE_SHELF = 'storage_shelf',
    PIPE = 'pipe',
}

export interface BaseCell {
    x: number; y: number;
    terrain: TerrainType;
    building: Building | null;
    temperature: number;
}

export interface Building {
    type: BuildingType;
    built: boolean;
    buildProgress: number;   // 0-1
    health: number;          // 0-100
}

export interface Room {
    id: number;
    cells: { x: number; y: number }[];
    temperature: number;
    insulationRate: number;  // 0-1
}

// ========== 幸存者 ==========

export interface Survivor {
    id: number;
    name: string;
    strength: number;        // 1-10
    intelligence: number;
    endurance: number;
    perception: number;
    health: number;          // 0-100
    nutrition: number;
    bodyTemp: number;
    morale: number;
    fatigue: number;
    frostbite: number;
    position: { x: number; y: number };
    trait: Trait;
}

export enum Trait {
    HARDWORKING = 'hardworking',
    LAZY = 'lazy',
    OPTIMISTIC = 'optimistic',
    PESSIMISTIC = 'pessimistic',
    BRAVE = 'brave',
}

export enum WorkType {
    BUILD = 'build',
    HUNT = 'hunt',
    FARM = 'farm',
    MEDICAL = 'medical',
    REPAIR = 'repair',
    SCAVENGE = 'scavenge',
    HAUL = 'haul',
}

// ========== 物品 ==========

export interface InventoryItem {
    itemId: string;
    quantity: number;
    freshness?: number;      // 0-1 (食物)
}

export enum ItemCategory {
    FOOD = 'food',
    FUEL = 'fuel',
    MATERIAL = 'material',
    ELECTRONIC = 'electronic',
    MEDICINE = 'medicine',
    TOOL = 'tool',
    BLUEPRINT = 'blueprint',
}

// ========== 天气与时间 ==========

export interface WeatherState {
    outdoorTemp: number;
    windSpeed: number;
    snowfall: number;        // 0-1
    isBlizzard: boolean;
}

export interface TimeState {
    day: number;
    hour: number;            // 0-24
    isPaused: boolean;
    gameSpeed: number;
}

// ========== 世界地图 ==========

export interface RegionNode {
    id: string;
    type: RegionType;
    distance: number;        // km
    fuelCost: number;
    risk: number;            // 1-5
    depletion: number;       // 0-100%
    discovered: boolean;
}

export enum RegionType {
    SUBURB = 'suburb',
    COMMERCIAL = 'commercial',
    INDUSTRIAL = 'industrial',
    HOSPITAL = 'hospital',
    MILITARY = 'military',
    WILDERNESS = 'wilderness',
}

// ========== 搜刮场景 ==========

export interface LootPoint {
    x: number; y: number;
    items: InventoryItem[];
    isLocked: boolean;
    searched: boolean;
}

export enum LootMethod {
    QUIET = 'quiet',        // 噪音+2, 100%
    FAST = 'fast',          // 噪音+8, 70%
    SMASH = 'smash',        // 噪音+25, 50%
}
