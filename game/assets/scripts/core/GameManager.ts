import { BaseCell, BuildingType } from '../data/interfaces';
import { TemperatureManager } from './TemperatureManager';
import { InventoryManager } from './InventoryManager';
import { SurvivorManager } from './SurvivorManager';
import { BuildManager } from './BuildManager';
import { WeatherManager } from './WeatherManager';
import { ScavengeManager } from './ScavengeManager';
import { CombatManager } from './CombatManager';
import { VehicleManager } from './VehicleManager';
import { GreenhouseManager } from './GreenhouseManager';

export class GameManager {
    temperature = new TemperatureManager();
    inventory = new InventoryManager();
    survivors = new SurvivorManager();
    build = new BuildManager();
    weather = new WeatherManager();
    scavenge = new ScavengeManager();
    combat = new CombatManager();
    vehicle = new VehicleManager();
    greenhouse = new GreenhouseManager();

    time = { day:1, hour:6, isPaused:false, gameSpeed:1 };
    baseGrid: BaseCell[][] = [];
    private gameTimer=0; private aiTimer=0;
    readonly SIZE=50;

    constructor(){
        this.build.init(this.weather.state.outdoorTemp);
        this.baseGrid=this.build.grid;
        this.temperature.setGrid(this.baseGrid);
        this.survivors.init();
        this.initInventory();
    }

    private initInventory(){
        const inv=this.inventory;
        inv.add('food_can',15); inv.add('food_bread',10); inv.add('food_meat_frozen',5);
        inv.add('fuel_wood',50); inv.add('fuel_coal',20);
        inv.add('mat_wood',40); inv.add('mat_metal',15); inv.add('mat_insulation',10);
    }

    // ========== 控制台 API ==========
    wall(x:number,y:number){ this.doBuild('wall',x,y); }
    floor(x:number,y:number){ this.doBuild('floor',x,y); }
    buildCmd(type:string,x:number,y:number){ this.doBuild(type,x,y); }
    plan(type:string,x:number,y:number){
        const err=this.build.plan(type,x,y);
        if(err) console.log(err);
        else console.log(`📐 蓝图: ${type} at (${x},${y})`);
    }
    pipe(x:number,y:number){ this.doBuild('pipe',x,y); }
    wallRect(x1:number,y1:number,x2:number,y2:number){
        const need=this.build.wallRect(x1,y1,x2,y2)*3;
        if(this.inventory.get('mat_wood')<need){ console.log(`木材不足 (需要${need})`); return; }
        this.inventory.remove('mat_wood',need);
        console.log(`✓ 矩形墙壁完成`);
    }

    private doBuild(type:string,x:number,y:number){
        const mat=type==='wall'||type==='floor'?'mat_wood':
                  type==='bed'?'mat_insulation':
                  type==='coalstove'?'mat_metal':
                  type==='pipe'?'mat_metal':'mat_wood';
        const cost=type==='wall'?3:type==='pipe'?1:type==='coalstove'?5:3;
        if(!this.inventory.has(mat,cost)){ console.log(`材料不足`); return; }
        const err=this.build.build(type,x,y);
        if(err){ console.log(err); return; }
        this.inventory.remove(mat,cost);
        if(type==='pipe') this.inventory.remove('mat_insulation',1);
        console.log(`✓ ${type} 已建造于 (${x},${y})`);
    }

    scavengeCmd(region:string){
        const r=this.scavenge.getRegion(region);
        if(!r){ console.log('未知区域。可选: suburb, commercial, hospital'); return; }
        if(!this.vehicle.hasUnlock(region)){ console.log('需要更高级载具'); return; }
        const fuel=r.fuel*this.vehicle.getFuelBonus();
        if(!this.inventory.has('fuel_wood',fuel)){ console.log('燃料不足'); return; }
        const dur=this.vehicle.getDurationBonus();
        const err=this.scavenge.start(region,fuel,dur);
        if(err){ console.log(err); return; }
        this.inventory.remove('fuel_wood',fuel);
        console.log(`🔍 出发前往 ${r.name}...`);
    }

    spawnCmd(type:string,x:number,y:number){
        const err=this.combat.spawn(type,x,y);
        if(err) console.log(err); else console.log(`👹 敌人出现`);
    }

    buildVehicle(type:string){
        const d=this.vehicle.getDef(type);
        if(!d){ console.log('未知载具'); return; }
        for(const[mat,cost] of Object.entries(d.cost))
            if(!this.inventory.has(mat,cost)){ console.log(`${mat}不足`); return; }
        for(const[mat,cost] of Object.entries(d.cost)) this.inventory.remove(mat,cost);
        this.vehicle.current=type;
        console.log(`🚛 ${d.name} 建造完成`);
    }

    buildGreenhouse(x:number,y:number){
        if(!this.inventory.has('mat_wood',10)||!this.inventory.has('mat_glass',5)||!this.inventory.has('mat_soil',3)){
            console.log('需要 木材×10 + 玻璃×5 + 土壤×3'); return;
        }
        this.inventory.remove('mat_wood',10); this.inventory.remove('mat_glass',5); this.inventory.remove('mat_soil',3);
        const err=this.greenhouse.build(x,y);
        if(err) console.log(err); else console.log('🌱 温室完成');
    }

    plantCmd(){
        const err=this.greenhouse.plant(this.baseGrid);
        if(err) console.log(err); else console.log('🌱 已种植');
    }

    heatmap(){
        let s=''; const g=this.baseGrid;
        for(let y=20;y<30;y++){ for(let x=20;x<30;x++){ const t=g[y][x].temperature;
            s+=t>=-5?'🔥':t>=-10?'░':t>=-20?'▒':'▓'; } s+='\n'; }
        console.log('热力图:\n'+s);
    }

    status(){
        const t=this.baseGrid[25][25].temperature.toFixed(1);
        const bz=this.weather.state.isBlizzard?' 🌨':'' ;
        console.log(`Day ${this.time.day}${bz} | 室外${this.weather.state.outdoorTemp.toFixed(0)}°C | 室内${t}°C | 食物${this.inventory.totalFood()} | 木${this.inventory.get('fuel_wood')} 煤${this.inventory.get('fuel_coal')}`);
        for(const s of this.survivors.survivors) console.log(`  ${s.name}: ❤${s.health} 🌡${s.bodyTemp}% 😊${s.morale}%`);
    }

    addFuel(n:number){ this.inventory.add('fuel_wood',n); console.log(`+木材×${n}`); }
    addMat(t:string,n:number){ this.inventory.add(t,n); console.log(`+${t}×${n}`); }
    togglePause(){ this.time.isPaused=!this.time.isPaused; console.log(this.time.isPaused?'⏸':'▶'); }

    // ========== 主循环 ==========
    update(dt:number){
        if(this.time.isPaused) return;

        this.aiTimer+=dt;
        if(this.aiTimer>=1){ this.aiTimer-=1;
            this.survivors.aiTick(
                (id)=>this.inventory.get(id),
                (id,qty)=>this.inventory.remove(id,qty),
                (x,y)=>this.build.placeBuilding(x,y),
                this.build.blueprints
            );
            for(const m of this.combat.tick(this.survivors.survivors,(id,qty)=>this.inventory.add(id,qty)))
                console.log(m);
        }

        if(this.scavenge.active){
            this.scavenge.timer+=dt;
            if(this.scavenge.timer>=this.scavenge.duration){
                const r=this.scavenge.complete((id,qty)=>this.inventory.add(id,qty));
                console.log(r.msg);
                for(const[id,qty] of Object.entries(r.loot)) console.log(`  ${id} ×${qty}`);
            }
        }

        const gDt=dt*this.time.gameSpeed;
        this.gameTimer+=gDt;
        this.temperature.setOutdoorTemp(this.weather.state.outdoorTemp);
        this.temperature.tick(gDt);
        this.survivors.updateBodyTemps((x,y)=>this.temperature.getCellTemp(x,y),gDt);

        this.time.hour+=gDt*10;
        if(this.time.hour>=1){
            this.time.hour-=1;
            const foodOk=this.inventory.remove('food_can',this.survivors.survivors.length*0.15)>0;
            const fm=this.weather.getFuelMultiplier();
            if(this.build.hasCoalStove()){ this.inventory.remove('fuel_coal',0.5*fm); this.inventory.remove('fuel_wood',0.1*fm); }
            else this.inventory.remove('fuel_wood',1*fm);
            this.survivors.hourlyTick(foodOk);
        }
        if(this.time.hour>=24){ this.time.hour-=24; this.time.day++; this.dailyTick(); }
        if(this.gameTimer>=10){ this.gameTimer-=10; this.printDay(); }
    }

    private dailyTick(){
        const wmsg=this.weather.dailyTick();
        if(wmsg) console.log(wmsg);
        const gmsg=this.greenhouse.dailyTick(this.baseGrid,(id,qty)=>this.inventory.add(id,qty));
        if(gmsg) console.log(gmsg);
        this.survivors.dailyTick();
    }

    private printDay(){
        this.status();
    }
}
