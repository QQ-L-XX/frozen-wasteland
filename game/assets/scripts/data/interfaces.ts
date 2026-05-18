// 极寒末世 — 核心类型定义

// ========== 地块与建筑 ==========
export enum TerrainType { SNOW='snow', PERMAFROST='permafrost', ROCK='rock', ICE_CRACK='ice_crack' }
export enum BuildingType {
    WALL_WOOD='wall_wood', FLOOR_WOOD='floor_wood', DOOR_WOOD='door_wood',
    FACILITY_FIREPIT='facility_firepit', FACILITY_COALSTOVE='facility_coalstove',
    BED_MATTRESS='bed_mattress', STORAGE_SHELF='storage_shelf', PIPE='pipe',
}
export interface BaseCell { x:number; y:number; terrain:TerrainType; building:Building|null; temperature:number }
export interface Building { type:BuildingType; built:boolean; buildProgress:number; health:number }
export interface Room { id:number; cells:{x:number;y:number}[]; insulationRate:number }

// ========== 幸存者 ==========
export interface Survivor {
    id:number; name:string; strength:number; intelligence:number; endurance:number; perception:number;
    health:number; nutrition:number; bodyTemp:number; morale:number; fatigue:number; frostbite:number;
    position:{x:number;y:number}; trait:Trait;
}
export enum Trait { HARDWORKING='hardworking', LAZY='lazy', OPTIMISTIC='optimistic', PESSIMISTIC='pessimistic', BRAVE='brave' }
export enum WorkType { BUILD='build', HUNT='hunt', FARM='farm', MEDICAL='medical', REPAIR='repair', SCAVENGE='scavenge', HAUL='haul' }

// ========== 天气与时间 ==========
export interface WeatherState { outdoorTemp:number; windSpeed:number; snowfall:number; isBlizzard:boolean }
export interface TimeState { day:number; hour:number; isPaused:boolean; gameSpeed:number }

// ========== 物品 ==========
export interface InventoryItem { itemId:string; quantity:number; freshness?:number }
export enum ItemCategory { FOOD='food', FUEL='fuel', MATERIAL='material', ELECTRONIC='electronic', MEDICINE='medicine', TOOL='tool', BLUEPRINT='blueprint' }
export interface ItemDef { id:string; name:string; volume:number; stackSize:number; rarity:'common'|'uncommon'|'rare'|'legendary' }

// ========== 搜刮 ==========
export interface LootPoint { x:number; y:number; items:InventoryItem[]; isLocked:boolean; searched:boolean }
export interface RegionDef { name:string; fuel:number; risk:number; loot:string[] }
export enum LootMethod { QUIET='quiet', FAST='fast', SMASH='smash' }

// ========== 战斗 ==========
export interface Enemy { type:string; x:number; y:number; hp:number; maxHp:number }
export interface VehicleDef { name:string; cost:Record<string,number>; unlocks:string[] }
