// 极寒末世 — 核心类型定义

// ========== 地块与建筑 ==========
export enum TerrainType { SNOW='snow', PERMAFROST='permafrost', ROCK='rock', ICE_CRACK='ice_crack' }
export enum BuildingType {
    WALL_WOOD='wall_wood', WALL_REINFORCED='wall_reinforced', WALL_UNDERGROUND='wall_underground', FLOOR_WOOD='floor_wood', DOOR_WOOD='door_wood',
    FACILITY_FIREPIT='facility_firepit', FACILITY_COALSTOVE='facility_coalstove', FACILITY_TRAP='facility_trap', FACILITY_MEDICAL='facility_medical', FACILITY_KITCHEN='facility_kitchen',
    FACILITY_WORKSHOP='facility_workshop', FACILITY_BOILER='facility_boiler', FACILITY_RADIO='facility_radio', FACILITY_GREENHOUSE='facility_greenhouse',
    FACILITY_GEOTHERMAL='facility_geothermal',
    DEFENSE_TURRET='defense_turret',
    LIGHT_LANTERN='light_lantern', WINDOW='window',
    BED_MATTRESS='bed_mattress', STORAGE_SHELF='storage_shelf', PIPE='pipe', GRAVE='grave',
}
export interface BaseCell { x:number; y:number; terrain:TerrainType; building:Building|null; temperature:number }
export interface Building { type:BuildingType; built:boolean; buildProgress:number; health:number }
export interface Room { id:number; cells:{x:number;y:number}[]; insulationRate:number; pipeNetworkId?:number }

export interface PipeNetwork { id:number; pipes:{x:number;y:number}[]; heatSource?:{x:number;y:number;type:BuildingType}; connectedRooms:number[] }

// ========== 幸存者 ==========
export interface Survivor {
    id:number; name:string; strength:number; intelligence:number; endurance:number; perception:number;
    health:number; nutrition:number; bodyTemp:number; morale:number; fatigue:number; frostbite:number;
    position:{x:number;y:number}; trait:Trait;
}
export enum Trait { HARDWORKING='hardworking', LAZY='lazy', OPTIMISTIC='optimistic', PESSIMISTIC='pessimistic', BRAVE='brave', CRAFTSMAN='craftsman' }
export enum WorkType { BUILD='build', HEAL='heal', FARM='farm', GUARD='guard', REST='rest', HUNT='hunt' }

// ========== 季节与天气 ==========
export enum Season { SPRING='spring', SUMMER='summer', AUTUMN='autumn', WINTER='winter' }
export interface WeatherState { outdoorTemp:number; windSpeed:number; snowfall:number; isBlizzard:boolean; season:Season; seasonDay:number }
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