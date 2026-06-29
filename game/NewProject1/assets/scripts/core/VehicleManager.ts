import { VehicleDef } from '../data/interfaces';

const VEHICLES: Record<string,VehicleDef> = {
    sled:{name:'雪橇',cost:{mat_wood:8,mat_metal:4,mat_insulation:3},unlocks:['commercial','wilderness','storage']},
    snowmobile:{name:'雪地摩托',cost:{mat_metal:15,part_circuit:5,part_motor:1},unlocks:['commercial','wilderness','storage','hospital','factory','military','research']},
};

export interface VehicleUpgrade {
    id: string;
    name: string;
    desc: string;
    cost: Record<string,number>;
    vehicle: string; // which vehicle it applies to
}

const UPGRADES: VehicleUpgrade[] = [
    {id:'sled_storage',name:'储物架',desc:'搜刮背包+4格',cost:{mat_wood:5,mat_metal:3},vehicle:'sled'},
    {id:'sled_heater',name:'小型炉',desc:'搜刮燃料消耗-30%',cost:{mat_metal:4,mat_insulation:2,fuel_coal:10},vehicle:'sled'},
    {id:'moto_heater',name:'车载加热',desc:'搜刮燃料消耗-50%',cost:{mat_metal:8,mat_insulation:5,part_circuit:3},vehicle:'snowmobile'},
    {id:'moto_racks',name:'扩容货架',desc:'搜刮背包+6格',cost:{mat_metal:10,mat_wood:8},vehicle:'snowmobile'},
];

export class VehicleManager {
    current: string|null = null;
    upgrades: Set<string> = new Set();

    getDef(type:string): VehicleDef|null { return VEHICLES[type]??null; }
    hasUnlock(region: string): boolean {
        if(region==='suburb'||region==='wilderness') return true;
        if(!this.current) return false;
        return VEHICLES[this.current]?.unlocks.includes(region)??false;
    }
    getFuelBonus(): number {
        let mult = this.current==='snowmobile'?0.5:1;
        if(this.current==='sled' && this.upgrades.has('sled_heater')) mult *= 0.7;
        if(this.current==='snowmobile' && this.upgrades.has('moto_heater')) mult *= 0.5;
        return mult;
    }
    getDurationBonus(): number { return this.current==='snowmobile'?18:24; }
    /** 升级提供的额外背包容量 */
    getBackpackBonus(): number {
        let bonus = 0;
        if(this.current==='sled' && this.upgrades.has('sled_storage')) bonus += 4;
        if(this.current==='snowmobile' && this.upgrades.has('moto_racks')) bonus += 6;
        return bonus;
    }

    getAvailableUpgrades(): VehicleUpgrade[] {
        if(!this.current) return [];
        return UPGRADES.filter(u=>u.vehicle===this.current && !this.upgrades.has(u.id));
    }

    installUpgrade(id: string): boolean {
        const u = UPGRADES.find(u=>u.id===id);
        if(!u || this.upgrades.has(id)) return false;
        this.upgrades.add(id);
        return true;
    }

    /** 序列化升级（用于存档） */
    serializeUpgrades(): string[] {
        return [...this.upgrades];
    }
    /** 恢复升级（从存档） */
    loadUpgrades(ids: string[]){
        this.upgrades = new Set(ids);
    }
}