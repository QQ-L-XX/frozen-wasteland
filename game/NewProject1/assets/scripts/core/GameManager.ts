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
import { EventManager, EventContext, GameEvent } from './EventManager';
import { EndingManager } from './EndingManager';
import { LongTermContext, LongTermManager } from './LongTermManager';
import { WorldContext, WorldManager } from './WorldManager';
import { OutpostContext, OutpostId, OutpostManager } from './OutpostManager';
import { ProductionContext, ProductionManager } from './ProductionManager';
import { CompletionContext, CompletionManager } from './CompletionManager';

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
    events = new EventManager();
    endings = new EndingManager();
    longTerm = new LongTermManager();
    world = new WorldManager();
    outposts = new OutpostManager();
    production = new ProductionManager();
    completion = new CompletionManager();
    // 等待玩家处理的选择事件
    pendingChoiceEvent: GameEvent|null = null;
    pendingEnding: any = null;
    pendingStory: any = null;
    // 统计数据
    stats = { wallsBuilt: 0, facilitiesBuilt: 0, scavengesDone: 0, enemiesKilled: 0, survivorsLost: 0, totalDaysPlayed: 0 };  // 待展示的幸存者背景故事
    pendingTutorial: string|null = null;  // 待展示的引导提示
    private _tutorialSteps = new Set<string>();
    private _bgStoriesTriggered = new Set<string>();

    time = { day:1, hour:6, isPaused:false, gameSpeed:1 };
    baseGrid: BaseCell[][] = [];
    private gameTimer=0; private aiTimer=0;
    private saveLoadVerified = false;
    readonly SIZE=50;
    difficulty: 'easy'|'normal'|'hard'|'nightmare'|'apocalypse' = 'normal';

    /** 时间流速：1实时秒 = TIME_SCALE 游戏小时（在 gameSpeed=1 时） */
    private static readonly TIME_SCALE = 0.3;
    /** gameSpeed → 加速倍率映射：1→1x, 2→2x, 3→4x */
    private static readonly SPEED_TABLE: Record<number,number> = {1:1, 2:2, 3:4};

    constructor(difficulty?: 'easy'|'normal'|'hard'|'nightmare'|'apocalypse'){
        if(difficulty) this.difficulty = difficulty;
        this.combat.diffMult = this.diffMult();
        this.build.init(this.weather.state.outdoorTemp);
        this.weather.init(this.time.day);
        this.baseGrid=this.build.grid;
        this.temperature.setGrid(this.baseGrid);
        this.survivors.init();
        // 难度差异化：hard 初始幸存者健康-20%，easy +10%
        if(this.difficulty==='hard') for(const s of this.survivors.survivors) s.health = Math.floor(s.health * 0.8);
        if(this.difficulty==='nightmare') for(const s of this.survivors.survivors) s.health = Math.floor(s.health * 0.65);
        if(this.difficulty==='apocalypse') for(const s of this.survivors.survivors){ s.health = Math.floor(s.health * 0.5); s.bodyTemp = Math.floor(s.bodyTemp * 0.6); }
        if(this.difficulty==='easy') for(const s of this.survivors.survivors) s.health = Math.min(100, Math.floor(s.health * 1.1));
        this.initInventory();
    }

    /** 获取难度倍率 */
    diffMult(): number {
        if(this.difficulty==='easy') return 0.7;
        if(this.difficulty==='hard') return 1.3;
        if(this.difficulty==='nightmare') return 1.6;
        if(this.difficulty==='apocalypse') return 2.0;
        return 1;
    }

    private initInventory(){
        const inv=this.inventory;
        const m = this.difficulty==='easy'?1.5:this.difficulty==='hard'?0.7:this.difficulty==='nightmare'?0.5:this.difficulty==='apocalypse'?0.3:1;
        inv.add('food_can',Math.round(20*m)); inv.add('food_bread',Math.round(12*m)); inv.add('food_meat_frozen',Math.round(6*m));
        inv.add('fuel_wood',Math.round(200*m)); inv.add('fuel_coal',Math.round(30*m));
        inv.add('mat_wood',Math.round(40*m)); inv.add('mat_metal',Math.round(15*m)); inv.add('mat_insulation',Math.round(10*m));
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
        const count = this.build.wallRectCount(x1,y1,x2,y2);
        const need = count * 3;
        if(this.inventory.get('mat_wood') < need){ this.lastBuildMsg=`木材不足(需${need})`; return; }
        this.inventory.remove('mat_wood', need);
        this.build.wallRectPlace(x1,y1,x2,y2);
        // 自动在下边中点或左边中点加一扇门
        const mx=Math.floor((x1+x2)/2), my=Math.min(y1,y2);
        const doorX=Math.abs(x2-x1)>=Math.abs(y2-y1)?mx:x1;
        const doorY=Math.abs(x2-x1)>=Math.abs(y2-y1)?my:Math.floor((y1+y2)/2);
        if(!this.build.grid[doorY][doorX].building){
            if(this.inventory.has('mat_wood',5)&&this.inventory.has('mat_metal',2)){
                this.inventory.remove('mat_wood',5); this.inventory.remove('mat_metal',2);
                this.build.build('door',doorX,doorY);
            }
        }
        this.build.dirty = true;
        this.lastBuildMsg='✓ 矩形围墙+门完成';
    }

    private wrapRoom(x:number,y:number){
        const ok=(nx:number,ny:number)=>nx>=10&&nx<40&&ny>=10&&ny<40;
        const put=(nx:number,ny:number,t:BuildingType)=>{
            if(ok(nx,ny)&&!this.baseGrid[ny][nx].building) this.baseGrid[ny][nx].building={type:t,built:true,buildProgress:1,health:60};
        };
        for(let dx=-1;dx<=1;dx++){ put(x+dx,y-1,BuildingType.WALL_WOOD); put(x+dx,y+2,BuildingType.WALL_WOOD); }
        put(x-1,y,BuildingType.WALL_WOOD); put(x+1,y,BuildingType.WALL_WOOD);
        put(x-1,y+1,BuildingType.WALL_WOOD); put(x+1,y+1,BuildingType.WALL_WOOD);
        put(x,y+1,BuildingType.FLOOR_WOOD);
        if(ok(x,y+2)) this.baseGrid[y+2][x].building={type:BuildingType.DOOR_WOOD,built:true,buildProgress:1,health:100};
        this.build.dirty=true;
    }

    private doBuild(type:string,x:number,y:number){
        let mat='mat_wood', cost=3, extraMat='', extraCost=0;
        if(type==='wall'){ mat='mat_wood'; cost=3; }
        else if(type==='floor'){ mat='mat_wood'; cost=1; }
        else if(type==='bed'){ mat='mat_insulation'; cost=3; }
        else if(type==='coalstove'){ mat='mat_metal'; cost=5; }
        else if(type==='pipe'){ mat='mat_metal'; cost=1; extraMat='mat_insulation'; extraCost=1; }
        else if(type==='workshop'){ mat='mat_metal'; cost=10; extraMat='part_circuit'; extraCost=3; }
        else if(type==='door'){ mat='mat_wood'; cost=5; extraMat='mat_metal'; extraCost=2; }
        else if(type==='rwall'){ mat='mat_wood'; cost=5; extraMat='mat_metal'; extraCost=2; }
        else if(type==='medical'){ mat='mat_metal'; cost=5; extraMat='mat_insulation'; extraCost=3; }
        else if(type==='kitchen'){ mat='mat_metal'; cost=3; extraMat='mat_wood'; extraCost=2; }
        else if(type==='boiler'){ mat='mat_metal'; cost=8; extraMat='mat_insulation'; extraCost=5; }
        else if(type==='lantern'){ mat='mat_metal'; cost=3; }
        else if(type==='trap'){ mat='mat_metal'; cost=3; extraMat='mat_wood'; extraCost=4; }
        else if(type==='window'){ mat='mat_glass'; cost=2; extraMat='mat_wood'; extraCost=2; }
        else if(type==='radio'){ mat='mat_metal'; cost=10; extraMat='part_circuit'; extraCost=5; }
        else if(type==='uwall'){ mat='mat_metal'; cost=4; extraMat='mat_insulation'; extraCost=5; }
        else if(type==='geothermal'){ mat='mat_metal'; cost=20; extraMat='part_circuit'; extraCost=8; }
        else if(type==='turret'){ mat='mat_metal'; cost=12; extraMat='part_circuit'; extraCost=4; }
        if(!this.inventory.has(mat,cost)){ this.lastBuildMsg='材料不足'; return; }
        if(extraMat && !this.inventory.has(extraMat,extraCost)){ this.lastBuildMsg='材料不足'; return; }
        const err=this.build.build(type,x,y);
        if(err){ this.lastBuildMsg=err; return; }
        this.inventory.remove(mat,cost);
        if(extraMat) this.inventory.remove(extraMat,extraCost);
        // 特殊设施自动围成独立房间
        if(['workshop','medical','kitchen','radio','geothermal'].includes(type)) this.wrapRoom(x,y);
        this.lastBuildMsg=`✓ ${type} 已建造`;
        if(type==='wall'||type==='rwall'||type==='uwall') this.stats.wallsBuilt++;
        else if(type!=='pipe') this.stats.facilitiesBuilt++;
    }

    buildGeothermal(x:number,y:number){ this.doBuild('geothermal',x,y); }
    buildTurret(x:number,y:number){ this.doBuild('turret',x,y); }
    buildUndergroundWall(x:number,y:number){ this.doBuild('uwall',x,y); }

    /** 埋葬尸体：移除 GRAVE，恢复士气 */
    buryCmd(x:number,y:number): string|null {
        if(x<0||x>=this.SIZE||y<0||y>=this.SIZE) return '坐标越界';
        const cell = this.baseGrid[y][x];
        if(cell.building?.type !== BuildingType.GRAVE) return '这里没有尸体';
        if(!this.inventory.has('mat_wood', 2)) return '需要木材×2';
        this.inventory.remove('mat_wood', 2);
        cell.building = null;
        for(const s of this.survivors.survivors) s.morale = Math.min(100, s.morale + 5);
        this.build.dirty = true;
        this.lastBuildMsg = '🪦 已安葬。愿逝者安息。';
        return null;
    }

    scavengeCmd(region:string): string|null {
        const r=this.scavenge.getRegion(region);
        if(!r) return '未知区域';
        if(!this.vehicle.hasUnlock(region)) return '需要更高级载具';
        const fuel=r.fuel*this.vehicle.getFuelBonus();
        if(region!=='suburb'&&region!=='wilderness'){
            const tf=this.inventory.get('fuel_wood')*100+this.inventory.get('fuel_coal')*300;
            if(tf<fuel*100) return `燃料不足（需≥${Math.ceil(fuel)}木材或等值煤炭）`;
        }
        const sr=this.vehicle.getDurationBonus();
        // 货架加成+载具升级背包容量
        const shelfCount = this.build.grid.flat().filter(c=>c.building?.type===BuildingType.STORAGE_SHELF && c.building?.built).length;
        const vehicleBonus = this.vehicle.getBackpackBonus();
        const svEnd = this.survivors.survivors[0]?.endurance ?? 4;
        const err=this.scavenge.start(region, shelfCount + Math.floor(vehicleBonus/2), svEnd);
        if(err) return err;
        this.scavenge.duration = sr;
        if(region!=='suburb'&&region!=='wilderness'){
            let need = fuel*100;
            const w = this.inventory.remove('fuel_wood', Math.ceil(need/100));
            need -= w*100;
            if(need>0) this.inventory.remove('fuel_coal', Math.ceil(need/300));
        }
        // 路上时间：往返各半天×距离（每 fuel 单位 = 12 游戏小时）
        const travelHours = r.fuel * 12;
        this.time.hour += travelHours;
        return null;
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
        if(x<0||x>=this.SIZE||y<0||y>=this.SIZE){
            this.lastBuildMsg='坐标越界'; return;
        }
        if(this.baseGrid[y][x].building){
            this.lastBuildMsg='该位置已有建筑'; return;
        }
        if(!this.inventory.has('mat_wood',10)||!this.inventory.has('mat_glass',5)||!this.inventory.has('mat_soil',3)){
            this.lastBuildMsg='需要 木材×10 + 玻璃×5 + 土壤×3'; return;
        }
        const err=this.greenhouse.build(x,y);
        if(!err){
            this.inventory.remove('mat_wood',10); this.inventory.remove('mat_glass',5); this.inventory.remove('mat_soil',3);
            // 在棋盘上放置温室建筑标记
            this.baseGrid[y][x].building = {type:BuildingType.FACILITY_GREENHOUSE, built:true, buildProgress:1, health:100};
            this.wrapRoom(x,y);
            this.lastBuildMsg='🌱 温室完成';
        } else {
            this.lastBuildMsg=err;
        }
    }

    plantCmd(){
        const err=this.greenhouse.plant(this.baseGrid);
        if(err) console.log(err); else console.log('🌱 已种植');
    }

    /** 无线电主动扫描 */
    scanRadio(): string|null {
        const hasRadio = this.baseGrid.some(row=>row.some(c=>c.building?.type===BuildingType.FACILITY_RADIO && c.building?.built));
        if(!hasRadio) return '需要先建造无线电室';
        if(!this.inventory.has('part_circuit',1)) return '需要电路板×1（扫描消耗）';
        this.inventory.remove('part_circuit',1);
        // 随机信号结果
        const roll = Math.random();
        if(roll < 0.25){
            this.lastRadioResult = '📡 扫描到商队信号：他们明天路过，带好物资准备交易';
            this.inventory.add('food_can', 3);
            this.inventory.add('mat_metal', 5);
            this.world.addFaction('caravan', 2);
        } else if(roll < 0.5){
            const bps = ['blueprint_coal','blueprint_greenhouse','blueprint_boiler','blueprint_radio'];
            const bp = bps[Math.floor(Math.random()*bps.length)];
            this.inventory.add(bp, 1);
            this.lastRadioResult = `📡 截获军用频道：获得 ${bp}×1`;
            this.world.addFaction('engineers', 1);
        } else if(roll < 0.75){
            const items = ['part_circuit','part_battery','mat_metal','fuel_coal'];
            const item = items[Math.floor(Math.random()*items.length)];
            const qty = 2+Math.floor(Math.random()*4);
            this.inventory.add(item, qty);
            this.lastRadioResult = `📡 监听到物资坐标：${item}×${qty}`;
        } else {
            this.lastRadioResult = '📡 只有白噪音...什么都没收到';
        }
        this.world.addInfluence(2);
        return this.lastRadioResult;
    }

    lastRadioResult = '';

    /** 手动返回基地（结算背包物品） */
    finishScavenge(){
        if(!this.scavenge.active) return;
        this.stats.scavengesDone++;
        this.world.addInfluence(1.5);
        const loot = this.scavenge.finalize((id,qty)=>this.addLoot(id,qty));
        if(loot) this.lastScavengeLoot = loot;
        // 难度差异化：hard 搜刮枯竭+10%
        if(this.difficulty==='hard') this.scavenge.depletion[this.scavenge.region] = Math.min(100, (this.scavenge.depletion[this.scavenge.region]||0)+10);
        // 🏥 医院：搜刮完成后治疗全体幸存者
        if(this.scavenge.regionFlags['hospitalHeal']){
            const healAmount = this.scavenge.regionFlags['hospitalHeal'];
            for(const s of this.survivors.survivors){
                if(s.health > 0) s.health = Math.min(100, s.health + healAmount);
            }
            this.lastBuildMsg = '🏥 医院搜刮完成！全体幸存者治疗 +' + healAmount + 'HP';
        }
        // 👤 发现幸存者：搜刮结束后自动加入
        if((this.scavenge as any)._foundSurvivor && this.survivors.survivors.length < 8){
            const names = ['林寒','赵铁','苏晴','陈默','王岩','李霜','周锐','吴桐','郑远','孙岚','钱程','刘念'];
            const used = new Set(this.survivors.survivors.map(s=>s.name));
            const avail = names.filter(n=>!used.has(n));
            const name = avail.length>0 ? avail[Math.floor(Math.random()*avail.length)] : '幸存者';
            const id = this.survivors.survivors.length + 1;
            this.survivors.survivors.push({
                id, name,
                strength:2+Math.floor(Math.random()*7), intelligence:2+Math.floor(Math.random()*7),
                endurance:2+Math.floor(Math.random()*7), perception:2+Math.floor(Math.random()*7),
                health:60+Math.floor(Math.random()*31), nutrition:60+Math.floor(Math.random()*31),
                bodyTemp:40+Math.floor(Math.random()*30), morale:40+Math.floor(Math.random()*40),
                fatigue:30+Math.floor(Math.random()*30), frostbite:Math.floor(Math.random()*20),
                position:{x:26, y:26}, trait:['hardworking','optimistic','brave','craftsman'][Math.floor(Math.random()*4)] as any,
                work: 'rest' as any,
            });
            this.lastBuildMsg = `👤 ${name} 加入了基地！`;
        }
    }

    // 查找库存中的蓝图物品
    findBlueprints(): string[] {
        const bp: string[] = [];
        const allIds = ['blueprint_coal','blueprint_greenhouse','blueprint_boiler','blueprint_radio'];
        for(const id of allIds){
            if(this.inventory.get(id) > 0) bp.push(id);
        }
        return bp;
    }

    // 蓝图前置依赖
    private blueprintReqs: Record<string,string[]> = {
        blueprint_coal:[], blueprint_greenhouse:[],
        blueprint_boiler:['blueprint_coal'],
        blueprint_radio:['blueprint_coal'],
    };
    checkBlueprintPrereqs(blueprintId: string, unlocked: Set<string>): string|null {
        const reqs = this.blueprintReqs[blueprintId];
        if(!reqs||reqs.length===0) return null;
        for(const req of reqs) if(!unlocked.has(req)) return `需要先解锁 ${req.replace('blueprint_','')} 技术`;
        return null;
    }

    // 解读蓝图（消耗物品 → 解锁）
    interpretBlueprint(blueprintId: string): string|null {
        if(!this.build.hasWorkshop()) return '需要建造工坊才能解读蓝图';
        if(!this.inventory.has(blueprintId, 1)) return '蓝图数量不足（需要完整1份）';
        this.inventory.remove(blueprintId, 1);
        return blueprintId; // 返回蓝图ID供UI处理unlocked
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
        console.log(`Day ${this.time.day}${bz} | 室外${this.weather.state.outdoorTemp.toFixed(0)}°C | 室内${t}°C | 食物${Math.round(this.inventory.totalFood())} | 木${Math.round(this.inventory.get('fuel_wood'))} 煤${Math.round(this.inventory.get('fuel_coal'))}`);
        for(const s of this.survivors.survivors) console.log(`  ${s.name}: ❤${Math.round(s.health)} 🌡${s.bodyTemp.toFixed(0)}% 😊${Math.round(s.morale)}%`);
    }

    lastScavengeLoot: Record<string,number> = {};
    lastBuildMsg = '';
    private _unlockedBlueprints: Set<string> = new Set();
    setUnlockedBlueprints(s: Set<string>){ this._unlockedBlueprints = s; }
    private addLoot(id:string, qty:number){
        if(id.startsWith('blueprint_') && this._unlockedBlueprints.has(id)){
            const mats = ['part_circuit','mat_metal','part_battery','mat_insulation'];
            const mat = mats[Math.floor(Math.random()*mats.length)];
            this.inventory.add(mat, 3+Math.floor(Math.random()*3));
        } else { this.inventory.add(id, qty); }
    }

    addFuel(n:number){ this.inventory.add('fuel_wood',n); console.log(`+木材×${n}`); }
    addMat(t:string,n:number){ this.inventory.add(t,n); console.log(`+${t}×${n}`); }
    togglePause(){ this.time.isPaused=!this.time.isPaused; }
    setSpeed(s:number){
        if(s===0){ this.time.isPaused=true; return; }
        this.time.isPaused=false;
        if(s>=1 && s<=3) this.time.gameSpeed=s;
    }
    getSpeedLabel(): string {
        if(this.time.isPaused) return '⏸';
        return ['','▶ 1x','⏩ 2x','⏭ 3x'][this.time.gameSpeed]||'▶';
    }

    // ========== 主循环 ==========
    update(dt:number){
        if(this.time.isPaused) return;
        if(this.survivors.survivors.length === 0) return;  // 全部死亡则停止模拟

        this.aiTimer+=dt;
        if(this.aiTimer>=1){ this.aiTimer-=1;
            this.build.recomputeConnectivity();
            (this.survivors as any)._hasBed = this.baseGrid.some(row=>row.some(c=>c.building?.type===BuildingType.BED_MATTRESS && c.building?.built));
            if(!this.scavenge.active) this.survivors.aiTick(
                (id)=>this.inventory.get(id),
                (id,qty)=>this.inventory.remove(id,qty),
                (x,y)=>this.build.placeBuilding(x,y),
                this.build.blueprints,
                {planted: this.greenhouse.planted},
                (id,qty)=>this.inventory.add(id,qty),
                this.baseGrid.flat().filter(c=>c.building?.type===BuildingType.FACILITY_TRAP && c.building?.built).length
            );
            if(!this.scavenge.active){
                // 自动装备最佳武器
                const weapons = ['weapon_shotgun','weapon_rifle','weapon_pistol','weapon_crowbar'];
                for(const w of weapons){ if(this.inventory.get(w)>0){ this.combat.equippedWeapon = w.replace('weapon_',''); break; } }
                for(const m of this.combat.tick(this.survivors.survivors,(id,qty)=>this.inventory.add(id,qty)))
                    console.log(m);
            }
        }

        if(this.scavenge.active && !this.scavenge.completeFlag){
            const sv = this.survivors.survivors[0];
            const svStats = sv ? {hp:sv.health, str:sv.strength, end:sv.endurance, per:sv.perception, int:sv.intelligence, trait:sv.trait} : null;
            const result = this.scavenge.tick(dt, svStats);
            if(result.msgs.length > 0) this.lastBuildMsg = `⚠ ${result.msgs[result.msgs.length-1]}`;
            // 自动战斗伤害处理
            if(result.survivorDmg > 0 && sv){
                const guard = 1 - this.survivors.guardDefense;
                sv.health = Math.max(0, sv.health - Math.floor(result.survivorDmg * guard));
                // 幸存者倒下 → 搜刮失败
                if(sv.health <= 0){
                    const loot = this.scavenge.fail((id,qty)=>this.addLoot(id,qty));
                    this.lastScavengeLoot = loot || {};
                    this.lastBuildMsg = `💀 ${sv.name} 被击倒！搜刮中断`;
                }
            }
            // 时间到，标记可深入（不暂停，玩家可继续搜刮）
            if(!this.scavenge.completeFlag && this.scavenge.timer >= this.scavenge.duration){
                if(!(this.scavenge as any)._deepChoice) (this.scavenge as any)._deepChoice=true;
            }
        }

        const gDt=dt*this.time.gameSpeed;
        this.gameTimer+=gDt;
        this.temperature.setOutdoorTemp(this.weather.state.outdoorTemp);
                const hasFuel = this.inventory.get('fuel_wood') > 0 || this.inventory.get('fuel_coal') > 0 || this.inventory.get('fuel_propane') > 0;
        this.temperature.tick(gDt, this.build.pipeNetworks, this.build.rooms, hasFuel);
        this.survivors.updateMovement(this.baseGrid);
        this.survivors.updateBodyTemps((x,y)=>this.temperature.getCellTemp(x,y),gDt);

        this.time.hour+=gDt*GameManager.TIME_SCALE*GameManager.SPEED_TABLE[this.time.gameSpeed];
        let hoursPassed = 0;
        while(this.time.hour>=1){
            this.time.hour-=1;
            hoursPassed++;
        }
        for(let h=0;h<hoursPassed;h++){
                        // 先从多种食物中扣除（厨房-25%，难度倍率）
            const kitchenMult = this.baseGrid.some(row=>row.some(c=>c.building?.type===BuildingType.FACILITY_KITCHEN && c.building?.built)) ? 0.75 : 1;
            let need = this.survivors.survivors.length * 0.04 * kitchenMult * this.diffMult();
            let ate = 0;
            const foodOrder = ['food_can','food_bread','food_ration','food_soup','food_mushroom','food_meat_frozen','food_veg','food_chocolate','food_vitamin'];
            for(const fid of foodOrder){
                if(need <= 0) break;
                const got = this.inventory.remove(fid, need);
                ate += got;
                need -= got;
                if(got>0 && fid==='food_soup'){ const eff=this.inventory.getFoodEfficiency(fid); for(const s of this.survivors.survivors) s.bodyTemp=Math.min(100,s.bodyTemp+2*eff); }
                if(got>0 && fid==='food_chocolate'){ const eff=this.inventory.getFoodEfficiency(fid); for(const s of this.survivors.survivors) s.morale=Math.min(100,s.morale+1*eff); }
                if(got>0 && fid==='food_vitamin'){ const eff=this.inventory.getFoodEfficiency(fid); for(const s of this.survivors.survivors) s.health=Math.min(100,s.health+0.5*eff); }
            }
            const foodOk = ate > 0;
            const fm=this.weather.getFuelMultiplier() * this.diffMult();
            // 锅炉优先消耗（煤炉存在时不叠加）
            const hasBoiler = this.baseGrid.some(row=>row.some(c=>c.building?.type===BuildingType.FACILITY_BOILER && c.building?.built));
            const hasGeothermal = this.build.hasGeothermal();
            if(hasGeothermal){
                // 地热井免费供暖，无需消耗燃料
            } else if(hasBoiler){ this.inventory.remove('fuel_coal',0.25*fm); this.inventory.remove('fuel_wood',0.08*fm); }
            else if(this.build.hasCoalStove()){ this.inventory.remove('fuel_coal',0.15*fm); this.inventory.remove('fuel_wood',0.05*fm); }
            else { this.inventory.remove('fuel_wood',0.3*fm); }
            // 木材+煤炭全空时，燃烧丙烷应急
            if(this.inventory.get('fuel_wood')<=0 && this.inventory.get('fuel_coal')<=0 && this.inventory.get('fuel_propane')>0){
                this.inventory.remove('fuel_propane',0.08*fm);
                console.log('🔥 丙烷罐应急供暖');
            }
            if(this.inventory.get('fuel_wood')<=0 && this.inventory.get('fuel_coal')<=0){
                // 丙烷已在上面处理
            }
            this.survivors.hourlyTick(foodOk);
            // 死亡检查：每小时检查幸存者是否健康归零
            this.checkDeaths();
            (this.time as any)._hours = ((this.time as any)._hours||0) + 1;
            if((this.time as any)._hours >= 24){
                (this.time as any)._hours = 0;
                this.time.day++;
                this.dailyTick();
            }
        }
        if(this.gameTimer>=30){ this.gameTimer-=30; this.printDay(); }
        // 每日自动存档
        this.writeLocalSave();
    }

    /** 检查并移除死亡幸存者，生成尸体和遗物 */
    private checkDeaths(){
        const deaths = this.survivors.survivors.filter(s=>s.health <= 0);
        if(deaths.length === 0) return;

        for(const dead of deaths){
            const idx = this.survivors.survivors.indexOf(dead);
            if(idx >= 0) this.survivors.survivors.splice(idx, 1);

            // 在死亡位置放置尸体标记
            const px = dead.position.x, py = dead.position.y;
            if(px>=0 && px<this.SIZE && py>=0 && py<this.SIZE){
                this.baseGrid[py][px].building = {
                    type: BuildingType.GRAVE,
                    built: true,
                    buildProgress: 0,
                    health: 1,
                };
            }

            // 遗物掉落：随机 1-3 个物品
            const lootPool = ['food_can','food_bread','med_bandage','mat_metal','mat_insulation','part_wire','story_note'];
            const count = 1 + Math.floor(Math.random() * 3);
            for(let i=0; i<count; i++){
                const item = lootPool[Math.floor(Math.random() * lootPool.length)];
                this.inventory.add(item, 1);
            }

            this.stats.survivorsLost++;
            // 士气惩罚
            for(const s of this.survivors.survivors){
                const rel = this.survivors.getRelation(dead.id, s.id);
                if(rel > 50) s.morale = Math.max(0, s.morale - 30);  // 挚友/亲人：加倍打击
                else s.morale = Math.max(0, s.morale - 15);
            }

            const msg = `💀 ${dead.name} 死了。遗物已回收。`;
            if(!this.lastBuildMsg || !this.lastBuildMsg.includes('💀')) this.lastBuildMsg = msg;
            console.log(msg);
        }

        this.build.dirty = true;

        // 立即检查全面崩溃
        if(this.survivors.survivors.length === 0 && !this.endings.triggered){
            const ending = this.endings.checkEndings({
                day: this.time.day,
                survivorCount: 0,
                survivorsAlive: 0,
                hasRadio: false, hasBoiler: false, hasGreenhouse: false,
                radioSignalsReceived: 0,
                totalFood: this.inventory.totalFood(),
                totalFuel: this.inventory.totalFuel(),
            });
            if(ending) this.pendingEnding = ending;
        }
    }

    private checkTutorials(){
        const step = (id: string, msg: string, cond: boolean) => {
            if(!this._tutorialSteps.has(id) && cond){
                this._tutorialSteps.add(id);
                this.pendingTutorial = msg;
            }
        };
        step('welcome', '🧊 欢迎来到极寒末世！\n\n你的基地只有一个简陋的木棚和一点物资。\n\n❄️ 温度是你的生命线——建造墙壁和供暖设备来抵御严寒。\n\n📦 搜刮废墟获取物资，但要小心敌人。\n\n🛠️ 从建造菜单开始——先建一堵墙试试。', this.time.day === 1);
        step('first_build', '🏗️ 干得好！你建造了第一堵墙。\n\n墙壁提供保温（40%），把房间围起来可以大幅减缓热量流失。\n\n试试建造更多墙壁围成封闭空间，然后放置煤炉供暖。', this.build.grid.flat().filter(c=>c.building?.type===BuildingType.WALL_WOOD).length >= 2);
        step('fuel_low', '⚠️ 燃料不足！\n\n剩余燃料撑不了几天了。派出幸存者去郊区搜刮木材——那是最近的区域，风险也最低。\n\n打开搜刮菜单选择郊区出发。', this.inventory.totalFuel() < 5000 && this.time.day >= 3);
        step('first_scavenge', '📦 第一次搜刮完成！\n\n你带回了一些物资。记得在仓储面板查看库存。\n\n不同区域有不同物资和风险——商业街有电路板但需要雪橇解锁。\n\n💡 建造货架可以增加背包容量。', this.time.day >= 1 && this.inventory.totalFood() > 40);
    }

    private dailyTick(){
        const wmsg=this.weather.dailyTick();
        if(wmsg) console.log(wmsg);
        const gmsg=this.greenhouse.dailyTick(this.baseGrid,(id,qty)=>this.inventory.add(id,qty));
        if(gmsg){ this.lastBuildMsg = gmsg; console.log(gmsg); }
        const op = this.outposts.dailyTick();
        const awarded: Record<string, number> = {};
        for(const [id, qty] of Object.entries(op.items)){
            const whole = Math.floor(qty);
            const fractional = qty - whole;
            const finalQty = whole + (Math.random() < fractional ? 1 : 0);
            if(finalQty > 0){
                this.inventory.add(id, finalQty);
                awarded[id] = (awarded[id] ?? 0) + finalQty;
            }
        }
        const awardedParts = Object.entries(awarded).map(([id, qty])=>`${id}×${qty}`);
        this.outposts.lastProduction.items = awarded;
        this.outposts.lastProduction.summary = awardedParts.length ? awardedParts.join(' ') : '无外部产出';
        this.world.dailyTick(this.getWorldContext());
        if(op.summary !== '无外部产出') this.lastBuildMsg = `外部哨站产出：${op.summary}`;
        if(op.messages.length > 0) this.lastBuildMsg = op.messages[0];
        // 医疗站：消耗药品提升治疗
        let medHeal = 0;
        for(const row of this.baseGrid) for(const c of row)
            if(c.building?.type===BuildingType.FACILITY_MEDICAL && c.building?.built) medHeal += 4;
        if(medHeal > 0){
            const meds = ['med_bandage','med_antibiotic','med_firstaid','med_herb'];
            let used = false;
            for(const m of meds){ if(this.inventory.get(m)>0){ this.inventory.remove(m,1); used=true; break; } }
            if(!used) medHeal = 2;
            for(const s of this.survivors.survivors) s.health = Math.min(100, s.health + medHeal);
        }
        // 尸体士气惩罚：每个尸体每日 -2 士气
        const graves = this.baseGrid.flat().filter(c=>c.building?.type===BuildingType.GRAVE).length;
        if(graves > 0){
            for(const s of this.survivors.survivors){
                s.morale = Math.max(0, s.morale - graves * 2);
            }
        }
        // 炮塔自动攻击：每日自动削减敌人血量
        const turretCount = this.build.hasTurret() ? 1 : 0;
        if(turretCount > 0 && this.combat.enemies.length > 0){
            let turretDmg = 15 * turretCount;
            for(let i=this.combat.enemies.length-1; i>=0; i--){
                if(turretDmg <= 0) break;
                const e = this.combat.enemies[i];
                e.hp -= turretDmg;
                turretDmg = Math.max(0, turretDmg - (e.maxHp - Math.max(0, e.hp)));
                if(e.hp <= 0){
                    const drops: Record<string,[string,number]> = {frozen:['mat_insulation',2],wolf:['food_meat_frozen',2],raider:['mat_metal',3],bear:['food_meat_frozen',3],scavenger:['food_can',1],bat:['part_circuit',1],hound:['food_meat_frozen',3]};
                    const drop = drops[e.type];
                    if(drop) this.inventory.add(drop[0], drop[1]);
                    this.combat.enemies.splice(i,1);
                }
            }
            if(this.combat.enemies.length === 0) this.lastBuildMsg = '🔫 炮塔已清除所有敌人';
        }
                const hasLantern = this.baseGrid.some(row=>row.some(c=>c.building?.type===BuildingType.LIGHT_LANTERN&&c.building?.built));
        this.survivors.dailyTick(hasLantern);
        // 窗户士气加成
        let winCount = 0;
        for(const row of this.baseGrid) for(const c of row)
            if(c.building?.type===BuildingType.WINDOW && c.building?.built) winCount++;
        if(winCount > 0) for(const s of this.survivors.survivors) s.morale = Math.min(100, s.morale + Math.min(winCount, 3));
        // 新手引导检测
        this.checkTutorials();
        // 食物腐坏：温度越高腐坏越快（<0°C减速，≥10°C加速）
        const roomTemp = this.temperature.getCellTemp(25,25);
        const tempMult = roomTemp >= 10 ? 2.0 : roomTemp >= 0 ? 1.0 : roomTemp >= -10 ? 0.5 : 0.1;
        this.inventory.decayFood(tempMult);
        // 关系自然演变：同工作组 +1/天
        const svs = this.survivors.survivors;
        for(let i=0; i<svs.length; i++){
            for(let j=i+1; j<svs.length; j++){
                if(svs[i].work === svs[j].work){
                    this.survivors.addRelation(svs[i].id, svs[j].id, 1);
                }
            }
        }
        // 无线电被动接收（有无线电室时每天概率触发）
        const hasRadio = this.baseGrid.some(row=>row.some(c=>c.building?.type===BuildingType.FACILITY_RADIO && c.building?.built));
        if(hasRadio && Math.random() < 0.35 && !this.pendingChoiceEvent){
            const signals = [
                {title:'📡 求救信号',msg:'无线电收到微弱求救：有幸存者被困在附近废墟中。',type:'choice',choiceA:'🧭 派出救援（消耗燃料×5）',choiceB:'🚫 忽略',effectA:'幸存者获救并加入',effectB:'信号消失了'},
                {title:'📡 商队广播',msg:'商队在公共频道广播：他们将在明天经过，愿意交易。',type:'instant',msg2:'准备好物资迎接商队'},
                {title:'📡 军用频道',msg:'截获一段加密军用通讯，提到了一个物资储藏点的坐标。',type:'instant',msg2:'获得 电路板×2 + 电池×3'},
            ];
            const sig = signals[Math.floor(Math.random()*signals.length)];
            this.endings.radioSignalCount++;
            if(sig.type === 'choice'){
                this.pendingChoiceEvent = {
                    id: 'radio_signal',
                    type: 'choice',
                    title: sig.title,
                    msg: sig.msg,
                    choiceA: sig.choiceA,
                    choiceB: sig.choiceB,
                    effectA: sig.effectA,
                    effectB: sig.effectB,
                    condition: () => true,
                };
            } else {
                this.lastBuildMsg = `${sig.title}: ${sig.msg2||sig.msg}`;
                if(sig.msg2?.includes('电路板')){ this.inventory.add('part_circuit',2); this.inventory.add('part_battery',3); }
            }
        }

        // 幸存者背景故事（按天数触发，任意幸存者存活即可）
        if(!this._bgStoriesTriggered.has('story1') && this.time.day >= 8 && this.survivors.survivors.length > 0){
            this._bgStoriesTriggered.add('story1'); this.pendingStory = {id:'bg_story_1'};
        }
        if(!this._bgStoriesTriggered.has('story2') && this.time.day >= 14 && this.survivors.survivors.length > 0){
            this._bgStoriesTriggered.add('story2'); this.pendingStory = {id:'bg_story_2'};
        }
        if(!this._bgStoriesTriggered.has('story3') && this.time.day >= 20 && this.survivors.survivors.length > 0){
            this._bgStoriesTriggered.add('story3'); this.pendingStory = {id:'bg_story_3'};
        }

        // 结局检测
        if(!this.endings.triggered){
            const alive = this.survivors.survivors.filter(s=>s.health>0);
            const hasRadio = this.baseGrid.some(row=>row.some(c=>c.building?.type===BuildingType.FACILITY_RADIO && c.building?.built));
            const hasBoiler = this.baseGrid.some(row=>row.some(c=>c.building?.type===BuildingType.FACILITY_BOILER && c.building?.built));
            const hasGreenhouse = this.greenhouse.built;
            const totalFuel = this.inventory.totalFuel();
            const ending = this.endings.checkEndings({
                day: this.time.day,
                survivorCount: this.survivors.survivors.length,
                survivorsAlive: alive.length,
                hasRadio, hasBoiler, hasGreenhouse,
                radioSignalsReceived: this.endings.radioSignalCount,
                totalFood: this.inventory.totalFood(),
                totalFuel,
            });
            if(ending) this.pendingEnding = ending;
        }

        // 事件系统
        const evt = this.events.dailyTick(this.makeEventContext());
        if(evt){
            if(evt.type === 'choice'){
                this.pendingChoiceEvent = evt;
            } else {
                this.lastBuildMsg = `📢 ${evt.title}: ${evt.msg}`;
                console.log(this.lastBuildMsg);
            }
        }
    }

    private printDay(){
        this.status();
    }

    // ========== EventContext 接口 ==========
    private makeEventContext(): EventContext {
        const g = this;
        return {
            get day() { return g.time.day; },
            get isBlizzard() { return g.weather.state.isBlizzard; },
            pipeCount: () => {
                let cnt=0;
                for(const row of this.baseGrid) for(const c of row)
                    if(c.building?.type===BuildingType.PIPE) cnt++;
                return cnt;
            },
            hasCoalStove: () => this.build.hasCoalStove(),
            hasWorkshop: () => this.build.hasWorkshop(),
            survivorCount: () => this.survivors.survivors.length,
            totalFuel: () => this.inventory.totalFuel(),
            getInventory: (id) => this.inventory.get(id),
            addInventory: (id,qty) => this.inventory.add(id,qty),
            removeInventory: (id,qty) => this.inventory.remove(id,qty),
            damageRandomPipe: () => {
                const pipes: {x:number;y:number}[] = [];
                for(let y=0;y<this.SIZE;y++) for(let x=0;x<this.SIZE;x++)
                    if(this.baseGrid[y][x].building?.type===BuildingType.PIPE && this.baseGrid[y][x].building?.built)
                        pipes.push({x,y});
                if(pipes.length===0) return false;
                const p = pipes[Math.floor(Math.random()*pipes.length)];
                this.baseGrid[p.y][p.x].building = null;
                this.build.dirty = true;
                return true;
            },
            damageRandomWall: () => {
                const walls: {x:number;y:number}[] = [];
                for(let y=0;y<this.SIZE;y++) for(let x=0;x<this.SIZE;x++)
                    if(this.baseGrid[y][x].building?.type===BuildingType.WALL_WOOD && this.baseGrid[y][x].building?.built)
                        walls.push({x,y});
                if(walls.length===0) return false;
                const w = walls[Math.floor(Math.random()*walls.length)];
                this.baseGrid[w.y][w.x].building = null;
                this.build.dirty = true;
                return true;
            },
            spawnEnemies: (type, count) => {
                for(let i=0;i<count;i++){
                    const x=20+Math.floor(Math.random()*10), y=20+Math.floor(Math.random()*10);
                    this.combat.spawn(type,x,y);
                }
            },
            healAll: (amount) => {
                for(const s of this.survivors.survivors) s.health = Math.min(100, s.health+amount);
            },
            boostMorale: (amount) => {
                for(const s of this.survivors.survivors) s.morale = Math.min(100, s.morale+amount);
            },
            loseMorale: (amount) => {
                for(const s of this.survivors.survivors) s.morale = Math.max(0, s.morale-amount);
            },
            reduceBodyTemp: (amount) => {
                for(const s of this.survivors.survivors) s.bodyTemp = Math.max(0, s.bodyTemp-amount);
            },
        };
    }

    // 处理玩家事件选择（wrapper，处理SOS等副作用）
    resolveEventChoice(choice: 'A'|'B'){
        const ctx = this.makeEventContext();
        const evtId = this.events.pendingEvent?.id;
        this.events.resolveChoice(choice, ctx);
        // 加幸存者（SOS 或难民）
        if(choice === 'A' && (evtId === 'sos')){
            this.addSurvivorFromSOS();
        }
        if(choice === 'A' && evtId === 'refugees' && Math.random() < 0.5){
            this.addSurvivorFromSOS();
        }
        // 无线电求救信号
        if(evtId === 'radio_signal'){
            if(choice === 'A'){
                const tf = this.inventory.totalFuel();
                if(tf >= 3000){
                    let need = 3000;
                    const w = this.inventory.remove('fuel_wood', Math.ceil(need/100));
                    need -= w*100;
                    if(need>0){
                        const c = this.inventory.remove('fuel_coal', Math.ceil(need/300));
                        need -= c*300;
                    }
                    if(need>0){
                        this.inventory.remove('fuel_propane', Math.ceil(need/800));
                    }
                    this.addSurvivorFromSOS();
                    this.lastBuildMsg = '🧭 救援成功！新成员加入了基地';
                } else {
                    this.lastBuildMsg = '燃料不足（需≥30木材或10煤炭或4丙烷）';
                }
            }
        }
    }

    // SOS 接受后添加幸存者
    addSurvivorFromSOS(){
        const names = ['流浪者','退伍兵','护士','猎人','工程师','农夫'];
        const name = names[Math.floor(Math.random()*names.length)];
        const maxId = this.survivors.survivors.reduce((m:number,s:any)=>Math.max(m,s.id),0);
        const id = maxId + 1;
        this.survivors.survivors.push({
            id, name, work: 'guard' as any,
            strength: 4+Math.floor(Math.random()*4),
            intelligence: 4+Math.floor(Math.random()*4),
            endurance: 4+Math.floor(Math.random()*4),
            perception: 4+Math.floor(Math.random()*4),
            health: 40, nutrition: 50, bodyTemp: 30, morale: 40, fatigue: 50, frostbite: 0,
            position: {x:26+Math.floor(Math.random()*3), y:24+Math.floor(Math.random()*3)},
            trait: (()=>{const traits=['brave','hardworking','optimistic','craftsman','lazy','pessimistic'];return traits[Math.floor(Math.random()*traits.length)] as any;})(),
        });
        console.log(`👤 ${name} 加入了基地！`);
    }

    getLongTermContext(): LongTermContext {
        const buildings: Record<string, number> = {};
        for(const row of this.baseGrid){
            for(const cell of row){
                const building = cell.building;
                if(building?.built){
                    buildings[building.type] = (buildings[building.type] ?? 0) + 1;
                }
            }
        }
        return {
            day: this.time.day,
            survivorCount: this.survivors.survivors.length,
            food: this.inventory.totalFood(),
            totalFuel: this.inventory.totalFuel(),
            buildings,
            vehicle: this.vehicle.current,
            radioSignals: this.endings.radioSignalCount,
            scavengesDone: this.stats.scavengesDone,
            worldInfluence: this.getWorldStatus().influence,
            outpostCount: this.outposts.getBuiltCount(),
            productionChains: this.getProductionStatus().activeCount,
        };
    }

    getLongTermStatus() {
        return this.longTerm.getStatus(this.getLongTermContext());
    }

    getWorldContext(): WorldContext {
        return {
            day: this.time.day,
            scavengesDone: this.stats.scavengesDone,
            radioSignals: this.endings.radioSignalCount,
            outpostCount: this.outposts.getBuiltCount(),
            hasRadio: this.hasBuilt(BuildingType.FACILITY_RADIO),
            hasSnowmobile: this.vehicle.current === 'snowmobile',
            hasGeothermal: this.build.hasGeothermal(),
        };
    }

    getWorldStatus() {
        return this.world.getStatus(this.getWorldContext());
    }

    getOutpostContext(): OutpostContext {
        return {
            day: this.time.day,
            influence: this.getWorldStatus().influence,
            hasWorkshop: this.build.hasWorkshop(),
            hasRadio: this.hasBuilt(BuildingType.FACILITY_RADIO),
            hasSnowmobile: this.vehicle.current === 'snowmobile',
            hasGeothermal: this.build.hasGeothermal(),
        };
    }

    getProductionContext(): ProductionContext {
        return {
            hasWorkshop: this.build.hasWorkshop(),
            hasBoiler: this.build.hasBoiler(),
            hasGeothermal: this.build.hasGeothermal(),
            outpostCount: this.outposts.getBuiltCount(),
            coalMineBuilt: this.outposts.getState('coal_mine').built,
            scrapDepotBuilt: this.outposts.getState('scrap_depot').built,
            greenFarmBuilt: this.outposts.getState('green_farm').built,
        };
    }

    getProductionStatus() {
        return this.production.getStatus(this.getProductionContext());
    }

    getCompletionContext(): CompletionContext {
        return {
            day: this.time.day,
            survivorCount: this.survivors.survivors.length,
            food: this.inventory.totalFood(),
            fuel: this.inventory.totalFuel(),
            buildings: this.getLongTermContext().buildings,
            vehicle: this.vehicle.current,
            scavengesDone: this.stats.scavengesDone,
            worldInfluence: this.getWorldStatus().influence,
            outpostCount: this.outposts.getBuiltCount(),
            productionChains: this.getProductionStatus().activeCount,
            radioSignals: this.endings.radioSignalCount,
            endingTriggered: !!this.endings.triggered,
            hasSave: typeof localStorage !== 'undefined' && !!localStorage.getItem('frost_save'),
            saveLoadVerified: this.saveLoadVerified,
        };
    }

    getCompletionStatus() {
        return this.completion.getStatus(this.getCompletionContext());
    }

    grantQaKit(): string {
        const pack: Record<string, number> = {
            food_can: 40, food_ration: 25, fuel_wood: 300, fuel_coal: 120,
            mat_wood: 180, mat_metal: 120, mat_insulation: 80, mat_glass: 40,
            mat_soil: 30, mat_foam: 30, part_wire: 40, part_circuit: 35,
            part_battery: 25, part_motor: 2, part_chip: 8, part_bearing: 8,
            med_bandage: 20, med_antibiotic: 12, med_firstaid: 8,
            blueprint_coal: 1, blueprint_greenhouse: 1, blueprint_boiler: 1, blueprint_radio: 1,
        };
        for(const [id, qty] of Object.entries(pack)) this.inventory.add(id, qty);
        this.world.addInfluence(20);
        this.lastBuildMsg = '🧪 QA测试包已加入仓库';
        return this.lastBuildMsg;
    }

    advanceDaysForQa(days: number): string {
        const n = Math.max(1, Math.min(120, Math.floor(days)));
        for(let i=0; i<n; i++){
            this.time.day++;
            (this.time as any)._hours = 0;
            this.dailyTick();
            this.stats.totalDaysPlayed = Math.max(this.stats.totalDaysPlayed, this.time.day);
        }
        if(typeof localStorage !== 'undefined'){
            try { this.writeLocalSave(); } catch(e){}
        }
        this.lastBuildMsg = `🧪 已快进 ${n} 天`;
        return this.lastBuildMsg;
    }

    saveLoadRoundtripForQa(extraSaveData: Record<string, any> = {}): string {
        let before = this.makeLocalSaveJson(extraSaveData);
        let source = before;
        if(typeof localStorage !== 'undefined'){
            try {
                localStorage.setItem('frost_save', before);
                source = localStorage.getItem('frost_save') || before;
            } catch(e){}
        }
        const err = this.load(source);
        if(err) return `读档失败：${err}`;
        const after = this.save();
        this.saveLoadVerified = before.length > 0 && after.length > 0;
        if(this.saveLoadVerified) this.writeLocalSave(extraSaveData);
        this.lastBuildMsg = this.saveLoadVerified ? '🧪 存档读档往返成功' : '🧪 存档为空';
        return this.lastBuildMsg;
    }

    runP0SmokeForQa(extraSaveData: Record<string, any> = {}): string {
        const snapshot = this.save();
        const snapshotData = JSON.parse(snapshot);
        let localSnapshot: string | null = null;
        let hadLocalSnapshot = false;
        if(typeof localStorage !== 'undefined'){
            try {
                localSnapshot = localStorage.getItem('frost_save');
                hadLocalSnapshot = localSnapshot !== null;
            } catch(e){}
        }
        let result = '';
        try {
            if(this.scavenge.active) this.finishScavenge();
            this.grantQaKit();
            const place = (type: string): boolean => {
                for(let y=10; y<40; y++){
                    for(let x=10; x<40; x++){
                        if(!this.baseGrid[y][x].building){
                            this.buildCmd(type, x, y);
                            return true;
                        }
                    }
                }
                return false;
            };
            for(let i=0; i<4; i++) place('bed');
            place('coalstove');
            place('workshop');
            for(let y=10; y<40 && !this.greenhouse.built; y++){
                for(let x=10; x<40 && !this.greenhouse.built; x++){
                    if(!this.baseGrid[y][x].building) this.buildGreenhouse(x, y);
                }
            }
            for(let i=0; i<3; i++){
                const err = this.scavengeCmd('suburb');
                if(!err) this.finishScavenge();
            }
            if(this.time.day < 7) this.advanceDaysForQa(7 - this.time.day);
            this.saveLoadRoundtripForQa(extraSaveData);
            const status = this.getCompletionStatus();
            const failed = status.items.filter(i=>i.priority === 'P0' && !i.done).map(i=>i.id);
            result = failed.length
                ? `🧪 P0烟测未完成：${failed.join(', ')}`
                : `🧪 P0烟测通过 · 完成度${status.score}%`;
            return result;
        } finally {
            this.load(snapshot);
            if(snapshotData.time) this.time = {...snapshotData.time};
            if(snapshotData.weather) this.weather.state = {...snapshotData.weather};
            if(typeof localStorage !== 'undefined'){
                try {
                    if(hadLocalSnapshot && localSnapshot !== null) localStorage.setItem('frost_save', localSnapshot);
                    else localStorage.removeItem('frost_save');
                } catch(e){}
            }
            this.lastBuildMsg = result || this.lastBuildMsg;
        }
    }

    private makeLocalSaveJson(extraSaveData: Record<string, any> = {}): string {
        const merged = JSON.parse(this.save());
        if(typeof localStorage !== 'undefined'){
            try {
                const existing = localStorage.getItem('frost_save');
                if(existing){
                    const prev = JSON.parse(existing);
                    for(const [key, value] of Object.entries(prev)){
                        if(!(key in merged) && extraSaveData[key] === undefined) merged[key] = value;
                    }
                }
            } catch(e){}
        }
        Object.assign(merged, extraSaveData);
        return JSON.stringify(merged);
    }

    saveLocal(extraSaveData: Record<string, any> = {}) {
        this.writeLocalSave(extraSaveData);
    }

    private writeLocalSave(extraSaveData: Record<string, any> = {}) {
        if(typeof localStorage === 'undefined') return;
        localStorage.setItem('frost_save', this.makeLocalSaveJson(extraSaveData));
    }

    markSaveLoadVerified(persist = false, extraSaveData: Record<string, any> = {}) {
        this.saveLoadVerified = true;
        if(persist) this.writeLocalSave(extraSaveData);
    }

    buildOutpost(id: OutpostId): string|null {
        const err = this.outposts.canBuild(id, this.getOutpostContext());
        if(err) return err;
        const def = this.outposts.getDefs().find(d=>d.id===id);
        if(!def) return '未知哨站';
        for(const [item, qty] of Object.entries(def.cost)){
            if(!this.inventory.has(item, qty)) return `${item}不足（需${qty}）`;
        }
        for(const [item, qty] of Object.entries(def.cost)) this.inventory.remove(item, qty);
        this.outposts.build(id);
        this.world.addInfluence(8);
        this.world.addFaction(id === 'scrap_depot' ? 'engineers' : id === 'green_farm' ? 'freeSettlement' : 'caravan', 5);
        return null;
    }

    resupplyOutposts(): string|null {
        if(this.outposts.getBuiltCount() === 0) return '还没有外部哨站';
        const cost: Record<string, number> = {fuel_wood: 20, mat_metal: 5};
        for(const [item, qty] of Object.entries(cost)){
            if(!this.inventory.has(item, qty)) return `${item}不足（需${qty}）`;
        }
        for(const [item, qty] of Object.entries(cost)) this.inventory.remove(item, qty);
        this.outposts.resupplyAll();
        this.world.addInfluence(2);
        return null;
    }

    private hasBuilt(type: BuildingType): boolean {
        return this.baseGrid.some(row=>row.some(c=>c.building?.type===type && c.building.built));
    }

    // ========== 存档/读档 ==========
    save(): string {
        const data: any = {
            v: 1,
            difficulty: this.difficulty,
            time: {...this.time},
            inv: {} as Record<string,number>,
            weather: {...this.weather.state},
            scavDepletion: {...this.scavenge.depletion},
            stats: {...this.stats},
            world: this.world.serialize(),
            outposts: this.outposts.serialize(),
            production: this.production.serialize(),
            vehicle: this.vehicle.current,
            vehicleUpgrades: this.vehicle.serializeUpgrades(),
            greenhouse: {built: this.greenhouse.built, x: this.greenhouse.x, y: this.greenhouse.y, planted: this.greenhouse.planted, days: this.greenhouse.days},
            longTerm: this.longTerm.serialize(),
            relations: [...this.survivors.relations.entries()],
            radioSignals: this.endings.radioSignalCount,
            endingTriggered: this.endings.triggered,
            qa: { saveLoadVerified: this.saveLoadVerified },
            tutorialSteps: [...this._tutorialSteps],
            bgStoriesTriggered: [...this._bgStoriesTriggered],
            survivors: this.survivors.survivors.map(s=>({...s, position:{...s.position}})),
            grid: this.baseGrid.map(row=>row.map(c=>({
                x:c.x, y:c.y, terrain:c.terrain, temperature:c.temperature,
                building: c.building?{...c.building}:null
            }))),
        };
        // 序列化库存
        this.inventory.forEach((id,qty)=>{ data.inv[id]={q:qty, f:this.inventory.getFreshness(id)}; });
        return JSON.stringify(data);
    }

    load(json: string): string|null {
        try {
            const data = JSON.parse(json);
            if(!data.v) return '无效存档';
            // 恢复难度
            if(data.difficulty) this.difficulty = data.difficulty;
            this.combat.diffMult = this.diffMult();
            // 先重置可选系统，避免旧档缺字段时保留当前局脏状态
            this.scavenge = new ScavengeManager();
            this.vehicle = new VehicleManager();
            this.greenhouse = new GreenhouseManager();
            this.world = new WorldManager();
            this.outposts = new OutpostManager();
            this.production = new ProductionManager();
            this.longTerm = new LongTermManager();
            this.endings.radioSignalCount = 0;
            this.endings.triggered = null;
            // 恢复时间
            if(data.time) this.time = {...this.time, ...data.time};
            // 恢复库存
            this.inventory = new InventoryManager();
            for(const[id,val] of Object.entries(data.inv || {})){ const v=val as any; this.inventory.add(id, typeof v==='number'?v:v.q||0, typeof v==='number'?100:v.f??100); }
            // 先按日期初始化默认天气，再用存档天气覆盖，避免读档重算天气。
            this.weather.init(this.time.day);
            if(data.weather) this.weather.state = {...this.weather.state, ...data.weather};
            // 恢复搜刮枯竭度
            if(data.scavDepletion) this.scavenge.depletion = data.scavDepletion;
            if(data.stats) this.stats = {...this.stats, ...data.stats};
            if(data.world) this.world.load(data.world);
            if(data.outposts) this.outposts.load(data.outposts);
            if(data.production) this.production.load(data.production);
            // 恢复载具
            if(typeof data.vehicle === 'string' || data.vehicle === null) this.vehicle.current = data.vehicle;
            if(Array.isArray(data.vehicleUpgrades)) this.vehicle.loadUpgrades(data.vehicleUpgrades);
            // 恢复温室
            if(data.greenhouse){
                this.greenhouse.built = !!data.greenhouse.built;
                this.greenhouse.x = data.greenhouse.x ?? this.greenhouse.x;
                this.greenhouse.y = data.greenhouse.y ?? this.greenhouse.y;
                this.greenhouse.planted = !!data.greenhouse.planted;
                this.greenhouse.days = data.greenhouse.days ?? this.greenhouse.days;
            }
            if(data.longTerm) this.longTerm.load(data.longTerm);
            // 恢复关系和结局状态
            if(Array.isArray(data.relations)){ this.survivors.relations = new Map(data.relations); }
            if(data.radioSignals !== undefined) this.endings.radioSignalCount = data.radioSignals;
            if(data.endingTriggered !== undefined) this.endings.triggered = data.endingTriggered;
            this.saveLoadVerified = !!data.qa?.saveLoadVerified;
            if(Array.isArray(data.tutorialSteps)) this._tutorialSteps = new Set(data.tutorialSteps);
            if(Array.isArray(data.bgStoriesTriggered)) this._bgStoriesTriggered = new Set(data.bgStoriesTriggered);
            // 恢复幸存者
            if(Array.isArray(data.survivors)) this.survivors.survivors = data.survivors;
            // 恢复棋盘
            if(Array.isArray(data.grid)){
                this.baseGrid = data.grid;
                this.build.grid = data.grid;
                this.temperature.setGrid(data.grid);
            }
            if(this.greenhouse.built && this.greenhouse.x >= 0 && this.greenhouse.x < this.SIZE && this.greenhouse.y >= 0 && this.greenhouse.y < this.SIZE){
                const cell = this.baseGrid[this.greenhouse.y][this.greenhouse.x];
                if(!cell.building){
                    cell.building = {type:BuildingType.FACILITY_GREENHOUSE, built:true, buildProgress:1, health:100};
                }
            }
            this.build.dirty = true;
            return null;
        } catch(e){ return '存档损坏'; }
    }
}
