import { Enemy, Survivor } from '../data/interfaces';

const ENEMY_TYPES: Record<string,{name:string;hp:number;drop:Record<string,number>}> = {
    frozen:{name:'冻饿者',hp:30,drop:{mat_insulation:2}},
    wolf:{name:'变异狼',hp:50,drop:{food_meat_frozen:2,mat_insulation:3}},
    raider:{name:'掠夺者',hp:60,drop:{mat_metal:3,part_battery:1}},
    bear:{name:'变异熊',hp:100,drop:{food_meat_frozen:5,mat_insulation:5}},
    scavenger:{name:'拾荒者',hp:40,drop:{mat_wood:3,part_wire:2}},
    bat:{name:'变异蝙蝠',hp:25,drop:{part_circuit:1,mat_insulation:2}},
    hound:{name:'变异猎犬',hp:35,drop:{food_meat_frozen:3,mat_insulation:1}},
    behemoth:{name:'冰原巨兽',hp:300,drop:{food_meat_frozen:10,mat_insulation:8,part_chip:2,part_bearing:2,blueprint_boiler:1}},
};

const WEAPON_DMG: Record<string, number> = {
    crowbar: 5, pistol: 9, shotgun: 17, rifle: 12,
};

export class CombatManager {
    enemies: Enemy[] = [];
    diffMult = 1;
    equippedWeapon: string | null = null;

    spawn(type:string,x:number,y:number): string|null {
        const t=ENEMY_TYPES[type];
        if(!t) return '未知敌人。可选: frozen, wolf, raider, bear, scavenger';
        this.enemies.push({type,x,y,hp:t.hp,maxHp:t.hp});
        return null;
    }

    tick(survivors: Survivor[], addInventory:(id:string,qty:number)=>void): string[] {
        const msgs: string[] = [];
        if(!this.enemies.length) return msgs;

        for(const e of this.enemies){
            let best:Survivor|null=null; let bestD=Infinity;
            for(const s of survivors){
                if(s.health <= 0) continue; // 跳过已倒下的幸存者
                const d=Math.abs(e.x-s.position.x)+Math.abs(e.y-s.position.y);
                if(d<bestD){bestD=d;best=s;}
            }
            if(!best) continue;
            if(bestD>1){
                if(best.position.x>e.x) e.x++; else if(best.position.x<e.x) e.x--;
                if(best.position.y>e.y) e.y++; else if(best.position.y<e.y) e.y--;
            }
            if(bestD<=1){
                best.health-=Math.floor((Math.floor(Math.random()*4)+2)*this.diffMult);
                if(best.health<=0){ best.health=0; msgs.push(`💀 ${best.name} 被击倒了！`); }
            }
        }

        for(const s of survivors){
            if(s.health<=0) continue;
            const target=this.enemies.find(e=>Math.abs(e.x-s.position.x)<=1&&Math.abs(e.y-s.position.y)<=1);
            if(target){ const wBonus=this.equippedWeapon?WEAPON_DMG[this.equippedWeapon]||0:0; target.hp-=8+Math.floor(Math.random()*5)+wBonus; }
        }

        const dead=this.enemies.filter(e=>e.hp<=0);
        for(const e of dead){
            const t=ENEMY_TYPES[e.type];
            msgs.push(`⚔ 击杀 ${t.name}`);
            for(const[id,qty] of Object.entries(t.drop)) addInventory(id,qty);
        }
        this.enemies=this.enemies.filter(e=>e.hp>0);
        return msgs;
    }
}