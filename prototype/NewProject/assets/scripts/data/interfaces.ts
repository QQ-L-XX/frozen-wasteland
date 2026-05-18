// 类型定义
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
