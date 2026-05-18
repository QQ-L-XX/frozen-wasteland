import { Survivor, Trait } from '../data/interfaces';

const INITIAL_SURVIVORS: Survivor[] = [
    {id:1,name:'老兵',strength:7,intelligence:5,endurance:6,perception:8,health:85,nutrition:95,bodyTemp:60,morale:78,fatigue:20,frostbite:0,position:{x:26,y:26},trait:Trait.BRAVE},
    {id:2,name:'技师',strength:5,intelligence:8,endurance:4,perception:4,health:90,nutrition:90,bodyTemp:55,morale:65,fatigue:30,frostbite:5,position:{x:27,y:25},trait:Trait.HARDWORKING},
    {id:3,name:'医生',strength:3,intelligence:7,endurance:5,perception:6,health:92,nutrition:88,bodyTemp:58,morale:81,fatigue:15,frostbite:0,position:{x:25,y:27},trait:Trait.OPTIMISTIC},
];

export class SurvivorManager {
    survivors: Survivor[] = [];

    init() { this.survivors = INITIAL_SURVIVORS.map(s=>({...s,position:{...s.position}})); }

    updateBodyTemps(getCellTemp:(x:number,y:number)=>number, dt:number) {
        for(const s of this.survivors){
            const{ x,y }=s.position;
            const t=getCellTemp(x,y);
            s.bodyTemp=Math.max(0,Math.min(100,s.bodyTemp+(t+15)*0.1*dt));
        }
    }

    hourlyTick(foodAvailable:boolean){
        if(!foodAvailable) for(const s of this.survivors) s.nutrition=Math.max(0,s.nutrition-2);
        for(const s of this.survivors) s.fatigue=Math.min(100,s.fatigue+2);
    }

    dailyTick(){
        for(const s of this.survivors) s.morale=Math.max(0,s.morale-1);
    }

    aiTick(getInventory:(id:string)=>number, removeInventory:(id:string,qty:number)=>number, placeBuilding:(x:number,y:number)=>void, blueprints:{x:number;y:number;material:string;cost:number}[]){
        const tech=this.survivors.find(s=>s.name==='技师');
        const doc=this.survivors.find(s=>s.name==='医生');
        if(tech && blueprints.length>0){
            let best:any=null,bestD=Infinity;
            for(const bp of blueprints){
                const d=Math.abs(bp.x-tech.position.x)+Math.abs(bp.y-tech.position.y);
                if(d<bestD){bestD=d;best=bp;}
            }
            if(best){
                tech.position.x=best.x; tech.position.y=best.y;
                if(getInventory(best.material)>=best.cost){
                    removeInventory(best.material,best.cost);
                    placeBuilding(best.x,best.y);
                    const idx=blueprints.indexOf(best);
                    if(idx>=0) blueprints.splice(idx,1);
                    console.log(`🔨 技师建造完成: (${best.x},${best.y})`);
                }
            }
        }
        if(doc){
            const patient=this.survivors.filter(s=>s.id!==doc.id&&s.health<90).sort((a,b)=>a.health-b.health)[0];
            if(patient){
                doc.position.x=patient.position.x; doc.position.y=patient.position.y;
                patient.health=Math.min(100,patient.health+5);
            }
        }
    }
}
