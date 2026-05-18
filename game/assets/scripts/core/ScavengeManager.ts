import { RegionDef } from '../data/interfaces';

const REGIONS: Record<string,RegionDef> = {
    suburb:{name:'郊区住宅',fuel:1,risk:1,loot:['food_can','food_bread','mat_wood','mat_insulation','story_note']},
    commercial:{name:'商业街',fuel:3,risk:2,loot:['food_can','food_veg','med_bandage','mat_metal','part_battery','part_wire']},
    hospital:{name:'医院',fuel:3,risk:3,loot:['med_bandage','med_antibiotic','med_frostbite','med_firstaid','story_diary','blueprint_boiler']},
};

export class ScavengeManager {
    depletion: Record<string,number> = {suburb:0,commercial:0,hospital:0};
    active=false; timer=0; duration=5; region='';

    getRegion(name:string): RegionDef|null { return REGIONS[name]??null; }
    getDepletion(name:string): number { return this.depletion[name]??0; }

    start(region:string, fuelCost:number, duration:number): string|null {
        if(this.active) return '已有探索队在外';
        const r=REGIONS[region];
        if(!r) return '未知区域';
        if(this.depletion[region]>=90) return `${r.name} 已被搜刮殆尽`;
        this.active=true; this.timer=0; this.duration=duration; this.region=region;
        return null;
    }

    complete(addInventory:(id:string,qty:number)=>void): {msg:string;loot:Record<string,number>} {
        const r=REGIONS[this.region];
        const df=1-this.depletion[this.region]/100;
        const count=Math.max(1,Math.floor((3+Math.random()*4)*df));
        const loot:Record<string,number>={};
        for(let i=0;i<count;i++){
            const id=r.loot[Math.floor(Math.random()*r.loot.length)];
            const qty=Math.floor(Math.random()*5)+1;
            addInventory(id,qty);
            loot[id]=(loot[id]??0)+qty;
        }
        this.depletion[this.region]=Math.min(100,this.depletion[this.region]+5+Math.random()*15);
        const msg=`📦 搜刮完成 — ${r.name}\n  枯竭度: ${this.depletion[this.region].toFixed(0)}%`;
        this.active=false;
        return {msg,loot};
    }
}
