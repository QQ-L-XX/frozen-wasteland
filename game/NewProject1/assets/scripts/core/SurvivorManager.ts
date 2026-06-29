import { Survivor, Trait } from '../data/interfaces';

const NAMES = ['林寒','赵铁','苏晴','陈默','王岩','李霜','周锐','吴桐','郑远','孙岚','钱程','刘念'];

function randomSurvivor(id: number): Survivor {
    const traits = [Trait.BRAVE, Trait.HARDWORKING, Trait.OPTIMISTIC, Trait.PESSIMISTIC, Trait.LAZY, Trait.CRAFTSMAN];
    return {
        id,
        name: NAMES[Math.floor(Math.random() * NAMES.length)],
        strength: 2 + Math.floor(Math.random() * 7),
        intelligence: 2 + Math.floor(Math.random() * 7),
        endurance: 2 + Math.floor(Math.random() * 7),
        perception: 2 + Math.floor(Math.random() * 7),
        health: 70 + Math.floor(Math.random() * 26),
        nutrition: 80 + Math.floor(Math.random() * 16),
        bodyTemp: 50 + Math.floor(Math.random() * 20),
        morale: 60 + Math.floor(Math.random() * 31),
        fatigue: 10 + Math.floor(Math.random() * 31),
        frostbite: Math.floor(Math.random() * 10),
        position: {x: 25 + Math.floor(Math.random()*3), y: 25 + Math.floor(Math.random()*3)},
        trait: traits[Math.floor(Math.random() * traits.length)],
    };
}

export type WorkType = 'build'|'heal'|'farm'|'guard'|'rest'|'hunt'|'radio';

export class SurvivorManager {
    survivors: (Survivor & {work: WorkType})[] = [];
    lastBark = '';
    relations: Map<string,number> = new Map();

    init() {
        this.survivors = [];
        for(let i=0; i<3; i++){
            const s = randomSurvivor(i+1);
            // 智能分配初始工作：最高智力→build/heal，最高力量→guard，其他→guard
            let work: WorkType = 'guard';
            if(s.intelligence >= 7) work = Math.random() < 0.5 ? 'build' : 'heal';
            else if(s.intelligence >= 5 && Math.random() < 0.5) work = 'build';
            this.survivors.push({...s, work});
        }
        // 初始化关系（陌生人，轻微好感）
        for(let i=0; i<3; i++){
            for(let j=i+1; j<3; j++){
                this.setRelation(i+1, j+1, 5 + Math.floor(Math.random() * 15));
            }
        }
    }

    private relKey(a:number,b:number):string{ return a<b?`${a}-${b}`:`${b}-${a}`; }
    getRelation(a:number,b:number):number{ return this.relations.get(this.relKey(a,b))??0; }
    setRelation(a:number,b:number,v:number){ this.relations.set(this.relKey(a,b),Math.max(-100,Math.min(100,v))); }
    addRelation(a:number,b:number,d:number){ this.setRelation(a,b,this.getRelation(a,b)+d); }
    getBestRelation(id:number):{id:number;name:string;val:number}|null{
        let best:{id:number;name:string;val:number}|null=null;
        for(const s of this.survivors){
            if(s.id===id) continue;
            const v=this.getRelation(id,s.id);
            if(!best||v>best.val) best={id:s.id,name:s.name,val:v};
        }
        return best;
    }
    getWorstRelation(id:number):{id:number;name:string;val:number}|null{
        let worst:{id:number;name:string;val:number}|null=null;
        for(const s of this.survivors){
            if(s.id===id) continue;
            const v=this.getRelation(id,s.id);
            if(!worst||v<worst.val) worst={id:s.id,name:s.name,val:v};
        }
        return worst;
    }

    setWork(id: number, work: WorkType){
        const s = this.survivors.find(sv=>sv.id===id);
        if(s) s.work = work;
    }

    updateBodyTemps(getCellTemp:(x:number,y:number)=>number, dt:number) {
        for(const s of this.survivors){
            const{ x,y }=s.position;
            const t=getCellTemp(x,y);
            s.bodyTemp=Math.max(0,Math.min(100,s.bodyTemp+(t+15)*0.1*dt));
        }
    }

    hourlyTick(foodAvailable:boolean){
        if(!foodAvailable) for(const s of this.survivors){ s.nutrition=Math.max(0,s.nutrition-2); s.health=Math.max(0,s.health-1); }
        for(const s of this.survivors) s.fatigue=Math.min(100,s.fatigue+2);
        for(const s of this.survivors){
            if(s.bodyTemp < 20) s.health = Math.max(0, s.health - 2);
            else if(s.bodyTemp < 35) s.health = Math.max(0, s.health - 0.5);
            if(s.morale < 10){ s.health = Math.max(0, s.health-0.5); s.fatigue=Math.min(100,s.fatigue+1); }
            else if(s.morale < 30){ s.health = Math.max(0, s.health-0.2); }
            else if(s.morale > 70){ s.health = Math.min(100, s.health+0.2); }
        }
    }
    getMoraleMult(s: Survivor): number {
        if(s.morale<10) return 0.5;
        if(s.morale<30) return 0.8;
        if(s.morale>80) return 1.3;
        if(s.morale>60) return 1.1;
        return 1;
    }
    /** 特质被动效果 */
    applyTraitEffects(s: Survivor){
        switch(s.trait){
            case 'brave': s.morale = Math.min(100, s.morale+0.5); break; // 勇敢：士气自然回升
            case 'hardworking': s.fatigue = Math.max(0, s.fatigue-1); break; // 勤劳：疲劳恢复快
            case 'optimistic': s.morale = Math.min(100, s.morale+1); break; // 乐观：士气大幅回升
            case 'lazy': s.fatigue = Math.min(100, s.fatigue+1); break; // 懒惰：更容易累
            case 'pessimistic': s.morale = Math.max(0, s.morale-0.5); break; // 悲观：士气持续下降
        }
    }
    /** 特质影响战斗/工作 */
    getTraitWorkMult(s: Survivor): number {
        if(s.trait==='hardworking') return 1.3;
        if(s.trait==='lazy') return 0.7;
        return 1;
    }

    dailyTick(hasLantern?: boolean){
        const base = hasLantern ? 0 : -1;
        for(const s of this.survivors){ s.morale=Math.max(0,s.morale+base); this.applyTraitEffects(s); }
        // 关系变化：同工种 + 距离 + 随机
        for(const a of this.survivors){
            for(const b of this.survivors){
                if(a.id>=b.id) continue;
                if(a.work===b.work) this.addRelation(a.id,b.id,0.1);
                const dist = Math.abs(a.position.x-b.position.x)+Math.abs(a.position.y-b.position.y);
                if(dist<=3) this.addRelation(a.id,b.id,0.05);
                if(Math.random()<0.2) this.addRelation(a.id,b.id,(Math.random()-0.5)*0.04);
            }
        }
    }

    /** 守卫在场时全体减伤比例 */
    get guardDefense(): number {
        return this.survivors.some(s=>s.work==='guard'&&s.health>0) ? 0.3 : 0;
    }

    private moveTimer=0;
    private moveGrid: any[][] = []; // 由外部注入 grid 引用

    updateMovement(grid: any[][]){
        this.moveGrid = grid;
        this.moveTimer++;
        if(this.moveTimer < 3) return; // 每 3 tick 移动一次
        this.moveTimer = 0;

        const directions = [[0,-1],[1,0],[0,1],[-1,0]];
        for(const s of this.survivors){
            if(s.health<=0) continue;
            // 随机漫步：尝试走到相邻可通行格子
            const shuffled = directions.sort(()=>Math.random()-0.5);
            for(const [dx,dy] of shuffled){
                const nx=s.position.x+dx, ny=s.position.y+dy;
                if(nx<10||nx>=40||ny<10||ny>=40) continue; // 不走出棋盘核心区
                const cell = grid[ny]?.[nx];
                if(!cell) continue;
                const bt = cell.building?.type;
                if(bt==='wall_wood'||bt==='wall_reinforced'||bt==='pipe'||bt==='window') continue;
                s.position.x=nx; s.position.y=ny;
                break;
            }
        }
    }

    aiTick(getInventory:(id:string)=>number, removeInventory:(id:string,qty:number)=>number, placeBuilding:(x:number,y:number)=>void, blueprints:{x:number;y:number;material:string;cost:number}[], greenhouse?:{planted:boolean}, addInventory?:(id:string,qty:number)=>void, trapCount?:number){
        this.lastBark = '';
        // 随机情境对话（每 tick 10% 概率）
        if(Math.random() < 0.1){
            const s = this.survivors[Math.floor(Math.random()*this.survivors.length)];
            if(s){
                const barks: Record<string,string[]> = {
                    build:['得把这些墙加固一下...','还需要更多材料。','让我把这弄好。'],
                    heal:['谁受伤了？让我看看。','医疗用品越来越少了...','别担心，会好起来的。'],
                    farm:['种子发芽了。','如果还有春天...','温室里的温度还可以。'],
                    guard:['我守在这里，你们放心。','外面有动静...','一切正常。'],
                    rest:['终于能歇口气了...','好冷...','得省着点力气。'],
                    hunt:['附近应该有猎物。','小心脚下的冰...','今天收获不错。'],
                    radio:['还在调试频率...','刚才好像收到了什么。','希望有人回复。'],
                };
                const pool = barks[s.work] || ['...'];
                this.lastBark = `${s.name}：「${pool[Math.floor(Math.random()*pool.length)]}」`;
            }
        }
        // 低健康/低士气特殊对话
        for(const s of this.survivors){
            if(s.health < 25 && Math.random() < 0.05){
                this.lastBark = `${s.name}：「我快撑不住了...」`;
            } else if(s.morale < 30 && Math.random() < 0.05){
                this.lastBark = `${s.name}：「这一切还有意义吗...」`;
            } else if(s.bodyTemp < 20 && Math.random() < 0.05){
                this.lastBark = `${s.name}：「太冷了...」`;
            }
        }
        // 关系冲突检测
        if(Math.random() < 0.03) for(const a of this.survivors){
            for(const b of this.survivors){
                if(a.id>=b.id) continue;
                const rel = this.getRelation(a.id,b.id);
                if(rel < -50){
                    this.lastBark = `${a.name} 和 ${b.name} 发生了争吵...（关系 ${Math.round(rel)}）`;
                    a.morale = Math.max(0, a.morale-3);
                    b.morale = Math.max(0, b.morale-3);
                } else if(rel > 80 && Math.random() < 0.3){
                    this.lastBark = `${a.name} 和 ${b.name} 互相鼓励。`;
                    a.morale = Math.min(100, a.morale+1);
                    b.morale = Math.min(100, b.morale+1);
                }
            }
        }
        // 建造者：工匠每次处理3个蓝图，普通2个（士气修正）
        for(const s of this.survivors.filter(sv=>sv.work==='build')){
            const mm = this.getMoraleMult(s) * this.getTraitWorkMult(s);
            const maxBuild = Math.max(1, Math.floor((s.trait === 'craftsman' ? 3 : 2) * mm));
            let built = 0;
            while(built < maxBuild && blueprints.length > 0){
                let best:any=null,bestD=Infinity;
                for(const bp of blueprints){
                    const d=Math.abs(bp.x-s.position.x)+Math.abs(bp.y-s.position.y);
                    if(d<bestD){bestD=d;best=bp;}
                }
                if(best && getInventory(best.material)>=best.cost){
                    removeInventory(best.material,best.cost);
                    placeBuilding(best.x,best.y);
                    const idx=blueprints.indexOf(best);
                    if(idx>=0) blueprints.splice(idx,1);
                    built++;
                } else break;
            }
        }
        // 医疗者：自回+治疗（士气影响效果）
        for(const s of this.survivors.filter(sv=>sv.work==='heal')){
            const mm = this.getMoraleMult(s);
            s.health = Math.min(100, s.health + 2*mm);
            const patient=this.survivors.filter(p=>p.id!==s.id&&p.health<85).sort((a,b)=>a.health-b.health)[0];
            if(patient){
                s.position.x=patient.position.x; s.position.y=patient.position.y;
                patient.health=Math.min(100,patient.health+8*mm);
                this.addRelation(s.id,patient.id,0.2); // 治疗增进关系
                break;
            }
        }
        // 种植者：温室加速 + 恢复疲劳
        for(const s of this.survivors.filter(sv=>sv.work==='farm')){
            s.fatigue = Math.max(0, s.fatigue-5);
            if(greenhouse?.planted){
                s.morale = Math.min(100, s.morale+0.5);
            }
            break;
        }
        // 守卫：全局减伤（所有幸存者受伤害-30%）
        for(const s of this.survivors.filter(sv=>sv.work==='guard')){
            s.fatigue = Math.max(0, s.fatigue-2);
            break;
        }
        // 无线电操作员：提升士气 + 有概率发现信号物资
        for(const s of this.survivors.filter(sv=>sv.work==='radio')){
            s.fatigue = Math.min(100, s.fatigue+1);
            s.morale = Math.min(100, s.morale+1);
            // 小概率被动发现物资
            if(addInventory && Math.random() < 0.03){
                const find = ['part_circuit','part_battery','part_wire'][Math.floor(Math.random()*3)];
                addInventory(find, 1);
            }
            break;
        }
        // 休息者：大幅恢复（有床翻倍）
        const hasBed = (this as any)._hasBed;
        const restMult = hasBed ? 2 : 1;
        for(const s of this.survivors.filter(sv=>sv.work==='rest')){
            s.fatigue = Math.max(0, s.fatigue-8*restMult);
            s.morale = Math.min(100, s.morale+2*restMult);
            s.health = Math.min(100, s.health+2*restMult);
        }
        // 狩猎者：外出打猎带回食物和毛皮
        if(addInventory) for(const s of this.survivors.filter(sv=>sv.work==='hunt')){
            s.fatigue = Math.min(100, s.fatigue+3);
            const trapBonus = (trapCount||0) * 5; // 每个陷阱+5%成功率
            const baseChance = 10 + s.perception * 2 + trapBonus;
            if(Math.random() * 100 < baseChance){
                const meat = 1 + Math.floor(Math.random() * 3 + s.perception / 3);
                const hide = Math.floor(Math.random() * 3);
                addInventory('food_meat_frozen', meat);
                if(hide > 0) addInventory('mat_insulation', hide);
                s.morale = Math.min(100, s.morale + 2);
            }
            // 5% 受伤风险
            if(Math.random() < 0.05){
                const dmg = 3 + Math.floor(Math.random() * 6);
                s.health = Math.max(0, s.health - dmg);
            }
            break;
        }
    }
}