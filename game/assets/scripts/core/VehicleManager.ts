import { VehicleDef } from '../data/interfaces';

const VEHICLES: Record<string,VehicleDef> = {
    sled:{name:'雪橇',cost:{mat_wood:8,mat_metal:4,mat_insulation:3},unlocks:['commercial']},
    snowmobile:{name:'雪地摩托',cost:{mat_metal:15,part_circuit:5,part_motor:1},unlocks:['commercial','hospital']},
};

export class VehicleManager {
    current: string|null = null;

    getDef(type:string): VehicleDef|null { return VEHICLES[type]??null; }
    hasUnlock(region:string): boolean {
        if(!this.current) return region==='suburb';
        return VEHICLES[this.current]?.unlocks.includes(region)??false;
    }
    getFuelBonus(): number { return this.current==='snowmobile'?0.5:1; }
    getDurationBonus(): number { return this.current==='snowmobile'?3:5; }
}
