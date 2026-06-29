import { RegionDef } from '../data/interfaces';

const REGIONS: Record<string,RegionDef> = {
    suburb:{name:'郊区住宅',fuel:1,risk:1,loot:['food_can','food_bread','food_soup','food_mushroom','fuel_wood','mat_wood','mat_wood','mat_insulation','mat_soil','mat_soil','story_note','med_bandage','part_wire']},
    wilderness:{name:'荒野森林',fuel:2,risk:2,loot:['food_meat_frozen','food_mushroom','food_chocolate','mat_wood','mat_insulation','mat_soil','med_herb','part_wire','story_note']},
    commercial:{name:'商业街',fuel:3,risk:2,loot:['food_can','food_veg','food_ration','food_chocolate','med_bandage','med_frostbite','med_painkiller','mat_metal','mat_soil','mat_foam','part_battery','part_wire','part_motor','part_chip','fuel_coal','mat_glass','blueprint_greenhouse','part_circuit']},
    storage:{name:'仓储区',fuel:3,risk:3,loot:['food_can','food_ration','fuel_wood','fuel_coal','mat_metal','mat_metal','mat_wood','mat_foam','part_battery','part_wire','part_circuit','mat_glass','blueprint_coal','blueprint_greenhouse']},
    hospital:{name:'医院',fuel:3,risk:3,loot:['med_bandage','med_antibiotic','med_frostbite','med_firstaid','med_painkiller','med_stimulant','story_diary','blueprint_coal','blueprint_boiler','blueprint_radio']},
    factory:{name:'废弃工厂',fuel:4,risk:4,loot:['part_circuit','part_battery','part_wire','part_motor','part_chip','part_bearing','mat_metal','mat_metal','fuel_coal','fuel_propane','mat_glass','blueprint_coal','blueprint_greenhouse','blueprint_boiler','blueprint_radio','weapon_crowbar']},
    military:{name:'军事基地',fuel:5,risk:5,loot:['food_ration','med_firstaid','med_stimulant','part_circuit','part_chip','part_motor','part_bearing','fuel_propane','mat_metal','mat_metal','blueprint_boiler','blueprint_radio','story_diary','weapon_pistol','weapon_shotgun','weapon_rifle']},
    research:{name:'极地研究所',fuel:5,risk:4,loot:['part_circuit','part_chip','part_battery','part_bearing','med_stimulant','med_antibiotic','fuel_propane','mat_glass','mat_foam','blueprint_radio','blueprint_greenhouse','blueprint_boiler','story_diary']},
};

const REGION_HINTS: Record<string,string> = {
    suburb: '住宅街巷：物资密、敌人少，适合前期稳扎稳打。',
    wilderness: '雪林岔路：冰面多、野兽多，路线判断和战斗压力更高。',
    commercial: '店铺长街：货架密集，噪音容易滚起来。',
    storage: '箱区迷宫：物资扎堆但绕路，背包和负重压力更明显。',
    hospital: '病房走廊：药品集中，房间多，遭遇点更突然。',
    factory: '坍塌厂区：废墟障碍多，毒气和绕路会拖慢探索。',
    military: '哨卡基地：敌点密集，风险高但武器和军需更值钱。',
    research: '冰封实验区：冰面和隐藏点多，科技物资概率更高。',
};

const REGION_TEMPLATES: Record<string,string[][]> = {
    suburb: [
        [
            '墟货空货空货门',
            '空空空墟空空空',
            '货墟货空货墟敌',
            '空空空空空空空',
            '敌墟货空货墟货',
            '空空空墟空空空',
            '冰货空空空货冰',
        ],
        [
            '货空墟货空敌门',
            '空空墟空空空空',
            '货空货空墟货空',
            '空墟空空空墟空',
            '货空货墟货空货',
            '空空空空空空空',
            '冰空货空货空冰',
        ],
    ],
    wilderness: [
        [
            '冰敌冰空冰货门',
            '空墟空冰空敌冰',
            '货冰敌冰货冰空',
            '冰空空空冰墟冰',
            '空敌冰货空敌空',
            '冰空墟冰空冰货',
            '冰空冰空冰空冰',
        ],
        [
            '货冰敌冰空冰门',
            '冰空墟空冰敌冰',
            '空冰货冰空冰货',
            '敌空冰空冰空敌',
            '冰货空墟空货冰',
            '空冰敌冰墟冰空',
            '冰空冰空冰空冰',
        ],
    ],
    commercial: [
        [
            '货货空货货敌门',
            '墟空墟空墟空空',
            '货货空货货空货',
            '空空空敌空空空',
            '货墟货空货墟货',
            '空空空货空空空',
            '货货空空空货货',
        ],
        [
            '货空货货空敌门',
            '货墟空墟货空空',
            '空空货空空货空',
            '货敌空货敌空货',
            '空空货空空货空',
            '货墟空墟货空货',
            '货货空空空货货',
        ],
    ],
    storage: [
        [
            '货墟货空货墟门',
            '空墟空空空墟空',
            '货货货墟货货敌',
            '墟空墟空墟空墟',
            '货空敌货空货货',
            '空墟空空空墟空',
            '货货空空空货货',
        ],
        [
            '敌货墟货空货门',
            '空空墟空墟空空',
            '货墟货货货墟货',
            '空空空墟空空空',
            '货敌货空货敌货',
            '空墟空空空墟空',
            '货货空空空货货',
        ],
    ],
    hospital: [
        [
            '货空货空货敌门',
            '空墟空墟空墟空',
            '货空敌空货空货',
            '空空空空空空空',
            '货墟货空敌墟货',
            '空墟空墟空墟空',
            '货空空空空空货',
        ],
        [
            '敌空货空货空门',
            '空墟空空空墟空',
            '货空货墟敌空货',
            '空空空空空空空',
            '货敌空墟货空货',
            '空墟空空空墟空',
            '货空空空空空货',
        ],
    ],
    factory: [
        [
            '墟货墟空敌墟门',
            '空空墟空墟空空',
            '货墟货墟货墟货',
            '空空空空敌空空',
            '墟货墟空墟货墟',
            '空墟空敌空墟空',
            '货空空空空空货',
        ],
        [
            '货墟敌墟货空门',
            '空墟空空墟空墟',
            '货空货墟货空货',
            '墟空墟空墟空墟',
            '敌空货空货空敌',
            '空墟空墟空墟空',
            '货空空空空空货',
        ],
    ],
    military: [
        [
            '敌空敌货敌空门',
            '墟空墟空墟空墟',
            '货敌空货空敌货',
            '空空空敌空空空',
            '敌墟货空货墟敌',
            '空空空货空空空',
            '冰空敌空敌空冰',
        ],
        [
            '货敌空敌货敌门',
            '空墟空空空墟空',
            '敌空货敌货空敌',
            '空墟空货空墟空',
            '敌空货敌货空敌',
            '空空空空空空空',
            '冰空敌空敌空冰',
        ],
    ],
    research: [
        [
            '冰货冰敌冰货门',
            '空墟冰空冰墟空',
            '货冰空货空冰货',
            '冰空敌冰敌空冰',
            '货冰空货空冰货',
            '空墟冰空冰墟空',
            '冰空冰空冰空冰',
        ],
        [
            '货冰空冰敌冰门',
            '冰墟冰货冰墟冰',
            '空冰货空货冰空',
            '冰敌空冰空敌冰',
            '空冰货空货冰空',
            '冰墟冰货冰墟冰',
            '冰空冰空冰空冰',
        ],
    ],
};

export interface ScavengeItem {
    id: string;
    name: string;
    taken: boolean;
}

export class ScavengeManager {
    depletion: Record<string,number> = {suburb:0,wilderness:0,commercial:0,storage:0,hospital:0,factory:0,military:0,research:0};
    active=false; timer=0; duration=5; region='';
    noise=0; // 噪音 0-100
    backpack: Record<string,number> = {}; // 背包物品
    maxSlots=8; // 背包容量（物品种类数）
    currentWeight=0; maxWeight=20; // 负重系统
    items: ScavengeItem[] = []; // 场景中的物品
    enemies: {hp:number;maxHp:number;dead?:boolean;type?:string}[] = [];
    private enemySpawnTimer=0;
    private combatTimer=0;
    private reinforceTimer=0;
    private toxicTimer=0;
    completeFlag=false;
    lastBonus: Record<string,number> = {};
    recentMsgs: string[] = []; // 最近战斗消息，供 UI 显示
    // 探索网格 7×7
    grid: string[][] = []; gridExplored: boolean[][] = []; gridGlimpsed: boolean[][] = [];
    gridPX=2; gridPY=4;
    regionFlags: Record<string,number> = {}; // 区域特效标记 {hospitalHeal, ...}

    /** 根据区域获取地形权重（空/货/敌/墟/冰） */
    private getTerrainPool(): string[] {
        const r = this.region || 'suburb';
        const weights: Record<string, Record<string, number>> = {
            suburb:     {空:2, 货:5, 敌:2, 墟:1, 冰:3},  // 郊区：多货少墟
            wilderness: {空:1, 货:3, 敌:4, 墟:1, 冰:4},  // 荒野：多敌多冰
            commercial: {空:2, 货:6, 敌:2, 墟:1, 冰:2},  // 商业街：最多货
            storage:    {空:1, 货:5, 敌:3, 墟:2, 冰:2},  // 仓储：多货多敌
            hospital:   {空:2, 货:4, 敌:3, 墟:1, 冰:3},  // 医院：均衡
            factory:    {空:1, 货:3, 敌:2, 墟:4, 冰:3},  // 工厂：多废墟
            military:   {空:2, 货:3, 敌:4, 墟:2, 冰:2},  // 军事：多敌人
            research:   {空:1, 货:4, 敌:2, 墟:2, 冰:4},  // 研究所：多冰多货
        };
        const w = weights[r] || weights['suburb'];
        const pool: string[] = [];
        for(const [type, count] of Object.entries(w)){
            for(let i=0; i<count; i++) pool.push(type);
        }
        return pool;
    }

    getRegionHint(name:string): string {
        return REGION_HINTS[name] ?? '未知地带：保持警惕，优先确认撤离路线。';
    }

    private pickRegionTemplate(region:string): string[] {
        const list = REGION_TEMPLATES[region] ?? REGION_TEMPLATES.suburb;
        return list[Math.floor(Math.random()*list.length)];
    }

    private randomizeTemplateCell(cell:string, pool:string[]): string {
        if(cell==='门') return '门';
        if(Math.random() > 0.16) return cell;
        const candidates = pool.filter(t=>t!=='门');
        return candidates[Math.floor(Math.random()*candidates.length)] || cell;
    }

    initGrid(){
        const SZ = 7;
        const s=SZ-1, m=Math.floor(SZ/2); // 起点(s,m): 底部正中
        const types = this.getTerrainPool();
        let attempts=0;
        while(attempts<30){
            attempts++;
            this.grid=[]; this.gridExplored=[]; this.gridGlimpsed=[];
            const template = this.pickRegionTemplate(this.region || 'suburb');
            for(let y=0;y<SZ;y++){ this.grid[y]=[]; this.gridExplored[y]=[]; this.gridGlimpsed[y]=[];
                for(let x=0;x<SZ;x++){
                    const base = template[y]?.[x] || types[Math.floor(Math.random()*types.length)];
                    this.grid[y][x]=this.randomizeTemplateCell(base, types);
                    this.gridExplored[y][x]=false; this.gridGlimpsed[y][x]=false;
                }
            }
            let exit={x:SZ-1,y:0};
            for(let y=0;y<SZ;y++) for(let x=0;x<SZ;x++) if(this.grid[y][x]==='门') exit={x,y};
            this.grid[exit.y][exit.x]='门';
            for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]){
                const nx=exit.x+dx,ny=exit.y+dy;
                if(nx>=0&&nx<SZ&&ny>=0&&ny<SZ&&this.grid[ny][nx]!=='门')
                    this.grid[ny][nx]='空';
            }
            this.grid[s][m]='空';
            // BFS验证路径（排除废墟）
            if(this._hasPath(m,s,exit.x,exit.y)) break;
        }
        // 极端情况兜底：找到出口并清通路径
        let ex=-1,ey=-1;
        for(let y=0;y<SZ;y++){ const xi=this.grid[y].indexOf('门'); if(xi>=0){ ex=xi; ey=y; break; } }
        if(ex>=0 && !this._hasPath(m,s,ex,ey)){
            const steps = Math.max(Math.abs(ex-m), Math.abs(ey-s), 1);
            for(let i=0;i<=steps;i++){
                const x=Math.round(m+(ex-m)*i/steps);
                const y=Math.round(s+(ey-s)*i/steps);
                if(this.grid[y]?.[x] && this.grid[y][x]!=='门') this.grid[y][x]='空';
            }
        }
        this.gridPX=m; this.gridPY=s; this.gridExplored[s][m]=true;
    }

    private _hasPath(sx:number,sy:number,ex:number,ey:number):boolean{
        const SZ=this.grid.length;
        const vis:boolean[][]=[];
        for(let y=0;y<SZ;y++){ vis[y]=[]; for(let x=0;x<SZ;x++) vis[y][x]=false; }
        const q:{x:number;y:number}[]=[{x:sx,y:sy}]; vis[sy][sx]=true;
        while(q.length){
            const {x,y}=q.shift()!;
            if(x===ex&&y===ey) return true;
            for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]){
                const nx=x+dx,ny=y+dy;
                if(nx>=0&&nx<SZ&&ny>=0&&ny<SZ&&!vis[ny][nx]&&this.grid[ny][nx]!=='墟'){
                    vis[ny][nx]=true; q.push({x:nx,y:ny});
                }
            }
        }
        return false;
    }
    moveTo(x:number,y:number,svIntel=4,svTrait=''):{type:string;msg:string;dmg?:number;loot?:{id:string;name:string};blocked?:boolean;revealed?:{x:number;y:number}[]}|null{
        const SZ=this.grid.length;
        if(x<0||x>=SZ||y<0||y>=SZ||Math.abs(x-this.gridPX)+Math.abs(y-this.gridPY)!==1) return null;
        if(this.enemies.filter(e=>!e.dead).length>0) return {type:'',msg:'⚠ 先消灭敌人才能移动！',blocked:true};
        // 废墟不可通行
        if(this.grid[y][x]==='墟') return {type:'',msg:'🧱 废墟挡住了去路',blocked:true};
        // 冰面可能滑移
        let slipped=false;
        if(this.grid[y][x]==='冰' && Math.random()<0.25){
            const dx=x-this.gridPX, dy=y-this.gridPY;
            const nx=x+dx, ny=y+dy;
            if(nx>=0&&nx<SZ&&ny>=0&&ny<SZ&&this.grid[ny][nx]!=='墟'){
                x=nx; y=ny; slipped=true;
            }
        }
        this.gridPX=x; this.gridPY=y;
        if(!this.gridExplored[y][x]){ this.gridExplored[y][x]=true; const t=this.grid[y][x]; const noiseBase=5+Math.random()*10; let noiseMult=1; if(svTrait==='hardworking') noiseMult=0.5; if(svTrait==='lazy') noiseMult=1.3; const noiseAdd=noiseBase*noiseMult; this.noise+=noiseAdd;
            const slip=slipped?'❄️ 冰面太滑！滑到了下一格！':''; // 滑倒前缀，不吞格子内容
            if(t==='货'){ const r=REGIONS[this.region]; const id=r?.loot[Math.floor(Math.random()*r.loot.length)]||'food_can'; this.addToBackpack(id); let extra=''; if(Math.random()<svIntel*0.05){ const id2=r?.loot[Math.floor(Math.random()*r.loot.length)]||'food_can'; this.addToBackpack(id2); extra=` +${this.itemName(id2)}`; } /* 🔧 工匠：15%概率额外获得金属/零件 */ if(svTrait==='craftsman'&&Math.random()<0.15&&!extra){ const mats=['mat_metal','part_circuit','part_wire']; const mid=mats[Math.floor(Math.random()*mats.length)]; this.addToBackpack(mid); extra=` +${this.itemName(mid)}`; } return {type:'货',msg:slip+`发现${this.itemName(id)}${extra}`,loot:{id,name:this.itemName(id)}}; }
            if(t==='敌'){
                // 🎖️ 军事基地：初始敌人HP+50%
                const milMult = this.region==='military'?1.5:1;
                const depthMult = 1 + ((this as any)._depth||0) * 0.2;
                const hp=Math.floor((15+Math.floor(Math.random()*20*(REGIONS[this.region]?.risk||1)))*depthMult*milMult);
                const rts:Record<string,string[]>={suburb:['frozen'],wilderness:['wolf'],commercial:['scavenger'],storage:['hound'],hospital:['bat'],factory:['hound'],military:['raider'],research:['bat']};
                const types=rts[this.region]||['frozen']; this.enemies.push({hp,maxHp:hp,type:types[Math.floor(Math.random()*types.length)]});
                // 🎖️ 军事基地：探索遭遇敌人时多刷一个
                if(this.region==='military'){
                    const hp2=Math.floor(hp*0.7);
                    const type2=types[Math.floor(Math.random()*types.length)];
                    this.enemies.push({hp:hp2,maxHp:hp2,type:type2});
                }
                return {type:'敌',msg:slip+'⚠ 遭遇敌人！',dmg:5+Math.floor(Math.random()*10)}; }
            if(t==='门'){ (this as any)._atExit=true; return {type:'门',msg:slip+'🚁 到达撤离点！可随时撤离'}; }
            if(t==='墟'){ return {type:'',msg:slip+'🧱 撞上了废墟！',blocked:true}; }
            if(t==='冰'){
                // 🔬 研究所：冰格25%概率发现隐藏物品
                if(this.region==='research' && Math.random()<0.25){
                    const r=REGIONS[this.region]; const id=r?.loot[Math.floor(Math.random()*r.loot.length)]||'part_chip';
                    this.addToBackpack(id);
                    return {type:'货',msg:slip+`🔬 冰层下发现${this.itemName(id)}！`,loot:{id,name:this.itemName(id)}};
                }
                return {type:'冰',msg:slip?slip:'❄️ 小心冰面...'}; }
            // t==='空'
            // 🔬 研究所：空格25%概率发现隐藏物品
            if(this.region==='research' && Math.random()<0.25){
                const r=REGIONS[this.region]; const id=r?.loot[Math.floor(Math.random()*r.loot.length)]||'part_chip';
                this.addToBackpack(id);
                return {type:'货',msg:slip+`🔬 角落发现${this.itemName(id)}！`,loot:{id,name:this.itemName(id)}};
            }
            // 👤 发现幸存者：1%概率（每局仅一次，幸存者<5时）
            if(!(this as any)._foundSurvivor && Math.random() < 0.01){
                (this as any)._foundSurvivor = true;
                return {type:'货',msg:slip+'👤 发现被困的幸存者！',loot:{id:'survivor',name:'幸存者'}};
            }
            // ✨ 稀有发现：2%概率在探索任意格子时触发（每局最多3次）
            const rc = (this as any)._rareCount || 0;
            if(rc < 3 && Math.random() < 0.02){
                (this as any)._rareCount = rc + 1;
                const epicItems = ['part_chip','part_bearing','fuel_propane','blueprint_boiler','blueprint_radio','med_firstaid'];
                const eid = epicItems[Math.floor(Math.random()*epicItems.length)];
                this.addToBackpack(eid);
                return {type:'货',msg:slip+`✨ 稀有发现！${this.itemName(eid)}`,loot:{id:eid,name:this.itemName(eid)}};
            }
            // 🏪 商业街：10%概率遇到友善拾荒者（每局仅一次）
            if(this.region==='commercial' && !(this as any)._merchantMet && Math.random()<0.1){
                (this as any)._merchantMet=true;
                const ids=['food_can','med_bandage','part_battery'];
                const id=ids[Math.floor(Math.random()*ids.length)]; const qty=1+Math.floor(Math.random()*2);
                for(let i=0;i<qty;i++) this.addToBackpack(id);
                return {type:'货',msg:slip+`🤝 友善拾荒者赠送${this.itemName(id)}×${qty}`,loot:{id,name:this.itemName(id)}};
            }
            return {type:'空',msg:slip+'空无一物...'}; }
        if(slipped) return {type:'冰',msg:'❄️ 冰面太滑！摔到了隔壁'};
        return {type:'移',msg:''};
    }

    getRegion(name:string): RegionDef|null { return REGIONS[name]??null; }
    getDepletion(name:string): number { return this.depletion[name]??0; }

    start(region:string, shelfCount=0, end=4): string|null {
        if(this.active) return '已有探索队在外';
        const r=REGIONS[region];
        if(!r) return '未知区域';
        if(this.depletion[region]>=90) return `${r.name} 已被搜刮殆尽`;
        this.active=true; this.timer=0; this.duration=24; this.region=region;
        this.noise=0; this.backpack={}; this.items=[]; this.currentWeight=0; this.maxWeight=8+end*2; this.recentMsgs=[];
        (this as any)._deepChoice=false; (this as any)._depth=0; (this as any)._evtCd=0; (this as any)._atExit=false; (this as any)._merchantMet=false; (this as any)._rareCount=0; (this as any)._foundSurvivor=false; // 重置状态
        this.initGrid(); // 初始化探索网格
        this.maxSlots = 8 + shelfCount * 2;
        // 🏪 仓储区：背包容量+3
        if(region==='storage') this.maxSlots += 3;
        // 区域专属特效
        this.regionFlags = {};
        if(region==='suburb') this.regionFlags.safe = 1;           // 噪音衰减加倍
        if(region==='wilderness') this.regionFlags.cold = 1;       // 体温加速下降
        if(region==='factory') this.regionFlags.toxic = 1;         // 毒气扣血
        if(region==='military') this.regionFlags.reinforce = 1;    // 增援波更频繁
        if(region==='hospital') this.regionFlags.heal = 1;         // 搜索完成回血
        if(region==='research') this.regionFlags.hiddenLoot = 1;   // 隐藏物品概率翻倍
        this.enemies=[]; this.enemySpawnTimer=0; this.combatTimer=0; this.reinforceTimer=0; this.toxicTimer=0; this.completeFlag=false;
        return null;
    }

    /** 拾取物品，返回是否成功 */
    pickup(index: number, svTrait=''): string|null {
        if(index<0||index>=this.items.length) return '无效物品';
        const item=this.items[index];
        if(item.taken) return '已拾取';
        const w=this.itemWeight(item.id);
        if(this.currentWeight+w > this.maxWeight) return `超重！(${this.currentWeight}/${this.maxWeight})`;
        if(Object.keys(this.backpack).length >= this.maxSlots) return '背包种类已满！';
        item.taken=true;
        this.addToBackpack(item.id);
        if(svTrait!=='optimistic'||Math.random()>0.5) this.noise+=8+Math.random()*10;
        return null;
    }

    /** 直接加入背包（追踪重量） */
    addToBackpack(id: string): void {
        this.backpack[id]=(this.backpack[id]??0)+1;
        this.currentWeight+=this.itemWeight(id);
    }

    /** 丢弃背包物品 */
    discard(itemId: string): boolean {
        if(!this.backpack[itemId]) return false;
        this.backpack[itemId]--;
        this.currentWeight=Math.max(0,this.currentWeight-this.itemWeight(itemId));
        if(this.backpack[itemId]<=0) delete this.backpack[itemId];
        this.noise = Math.max(0, this.noise-3);
        return true;
    }

    /** 每帧更新，返回消息和幸存者受到的伤害 */
    tick(dt: number, svStats: {hp:number; str:number; end:number; per:number; int:number; trait:string}|null): { msgs:string[]; survivorDmg:number } {
        if(!this.active||this.completeFlag) return {msgs:[],survivorDmg:0};
        this.timer+=dt;
        const msgs: string[] = [];
        let survivorDmg = 0;

        // 环境危害
        if(this.regionFlags.toxic){
            this.toxicTimer += dt;
            if(this.toxicTimer >= 2){
                this.toxicTimer -= 2;
                survivorDmg += 1;
                if(!svStats || svStats.hp <= 0) {}
            }
        }
        if(this.regionFlags.cold && svStats){
            survivorDmg += 0.5 * dt; // 荒野低温持续伤害
        }

        // 噪音衰减（🏭 工厂：衰减减半；🏡 郊区：衰减加倍）
        const noiseDecay = this.regionFlags.toxic?1:this.regionFlags.safe?4:2;
        if(this.noise>0) this.noise=Math.max(0,this.noise-noiseDecay*dt);

        // 噪音 > 50 时可能遭遇额外敌人
        if(this.noise>50){
            this.enemySpawnTimer+=dt;
            const spawnCD = this.noise>80 ? 1.5 : 2.5;
            if(this.enemySpawnTimer>spawnCD+Math.random()*2){
                this.enemySpawnTimer=0;
                const r=REGIONS[this.region];
                const mult = this.noise>80?1.8:1;
                const depthMult = 1 + ((this as any)._depth||0) * 0.2;
                // 🎖️ 军事基地：敌人HP+50%
                const milMult = this.region==='military'?1.5:1;
                const hp=Math.floor((20+Math.floor(Math.random()*30*r.risk))*mult*depthMult*milMult);
                const regionTypes: Record<string,string[]> = {
                    suburb:['frozen','wolf','scavenger'],
                    wilderness:['wolf','bat','hound'],
                    commercial:['scavenger','bat','frozen'],
                    storage:['frozen','hound','scavenger'],
                    hospital:['scavenger','bat','frozen'],
                    factory:['hound','scavenger','bat'],
                    military:['raider','hound','wolf'],
                    research:['bat','scavenger','frozen'],
                };
                const types = regionTypes[this.region]||['frozen','wolf','scavenger'];
                const type = this.noise>80?types[types.length-1]:types[Math.floor(Math.random()*types.length)];
                this.enemies.push({hp, maxHp:hp, type});
                // 🎖️ 军事基地：每次多刷一个敌人
                if(this.region==='military'){
                    const hp2=Math.floor(hp*0.7);
                    const type2=types[Math.floor(Math.random()*types.length)];
                    this.enemies.push({hp:hp2,maxHp:hp2,type:type2});
                }
                msgs.push(this.noise>80?'⚠ 危险！更强敌人逼近！':'⚠ 敌人出现了！');
            }
        }

        // 自动战斗
        if(svStats && svStats.hp > 0 && this.enemies.filter(e=>!e.dead).length > 0){
            const interval = this.noise>80?0.8:this.noise>60?1.1:1.5;
            this.combatTimer += dt;
            let rounds = 0;
            while(this.combatTimer >= interval && rounds < 3){
                this.combatTimer -= interval; rounds++;
                const alive = this.enemies.filter(e=>!e.dead);
                if(alive.length === 0) break;
                alive.sort((a,b)=>a.hp-b.hp);
                const target = alive[0];
                // 🌲 荒野：感知≥6时战斗伤害+20%
                const wildMul = (this.region==='wilderness' && svStats && svStats.per>=6)?1.2:1;
                const braveMul = svStats.trait==='brave'?1.2:1; const pessimMul = svStats.trait==='pessimistic'?0.85:1;
                const playerDmg = Math.floor((3 + Math.floor(svStats.str*1.5) + Math.floor(Math.random()*8))*braveMul*pessimMul*wildMul);
                target.hp -= playerDmg;
                const ename = this.enemyName(target.type||'');
                if(target.hp <= 0){
                    target.dead = true;
                    this.noise = Math.max(0, this.noise - 15);
                    msgs.push(`⚔️ 击杀 ${ename}！`);
                } else {
                    msgs.push(`⚔️ 攻击 ${ename} -${playerDmg}`);
                }
                const stillAlive = this.enemies.filter(e=>!e.dead);
                if(stillAlive.length > 0){
                    let totalDmg = 0;
                    for(const e of stillAlive) totalDmg += 4 + Math.floor(Math.random()*7);
                    const def = Math.max(1, svStats.end);
                    const reduced = Math.max(1, Math.floor(totalDmg * (1 - def * 0.07)));
                    survivorDmg += reduced;
                    msgs.push(`👹 ${stillAlive.length}敌反击 -${reduced}`);
                }
            }
        }

        // 噪音 ≥90 时概率触发增援
        if(this.noise>=90){
            this.reinforceTimer+=dt;
            if(this.reinforceTimer>5+Math.random()*3){
                this.reinforceTimer=0;
                const r=REGIONS[this.region];
                let count=2+Math.floor(Math.random()*2);
                // 🎖️ 军事基地：增援数量加倍
                if(this.region==='military') count=Math.floor(count*1.5);
                const depthMult=1+((this as any)._depth||0)*0.2;
                const milMult=this.region==='military'?1.5:1;
                for(let i=0;i<count;i++){
                    const hp=Math.floor((25+Math.random()*25*r.risk)*depthMult*milMult);
                    const types=['raider','hound','wolf'];
                    this.enemies.push({hp,maxHp:hp,type:types[Math.floor(Math.random()*types.length)]});
                }
                msgs.push('🚨 噪音引来增援！');
            }
        }

        if(msgs.length>0){ this.recentMsgs.push(...msgs); if(this.recentMsgs.length>5) this.recentMsgs.splice(0,this.recentMsgs.length-5); }
        return {msgs, survivorDmg};
    }

    fail(addInventory:(id:string,qty:number)=>void): Record<string,number>|null {
        const ids = Object.keys(this.backpack);
        const saved: Record<string,number> = {};
        for(const id of ids){
            const qty = Math.floor(this.backpack[id] / 2);
            if(qty > 0){ addInventory(id, qty); saved[id] = qty; }
        }
        this.completeFlag = true;
        this.active = false;
        return Object.keys(saved).length > 0 ? saved : null;
    }

    finalize(addInventory:(id:string,qty:number)=>void): Record<string,number>|null {
        if(Object.keys(this.backpack).length===0){
            this.depletion[this.region]=Math.min(100,(this.depletion[this.region]||0)+5+Math.random()*15);
            this.completeFlag=true;
            this.active=false;
            this.lastBonus = {};
            return null;
        }
        for(const[id,qty] of Object.entries(this.backpack)){
            addInventory(id,qty);
        }
        const bonus:Record<string,number>={};
        if(this.region==='suburb'){
            const b=5+Math.floor(Math.random()*5);
            addInventory('fuel_wood',b); addInventory('mat_wood',b);
            bonus['fuel_wood']=(bonus['fuel_wood']??0)+b;
            bonus['mat_wood']=(bonus['mat_wood']??0)+b;
            const f=2+Math.floor(Math.random()*3);
            addInventory('food_can',f);
            bonus['food_can']=(bonus['food_can']??0)+f;
        }
        if(this.region==='commercial'){
            const b=2+Math.floor(Math.random()*3);
            addInventory('part_circuit',b); addInventory('mat_metal',b+3);
            bonus['part_circuit']=(bonus['part_circuit']??0)+b;
            bonus['mat_metal']=(bonus['mat_metal']??0)+b+3;
        }
        if(this.region==='hospital'){
            const b=1+Math.floor(Math.random()*2);
            addInventory('med_bandage',b+2); addInventory('med_antibiotic',b);
            addInventory('med_firstaid',1);
            bonus['med_bandage']=(bonus['med_bandage']??0)+b+2;
            bonus['med_antibiotic']=(bonus['med_antibiotic']??0)+b;
            bonus['med_firstaid']=(bonus['med_firstaid']??0)+1;
            // 🏥 医院：标记治疗全体幸存者20HP
            this.regionFlags['hospitalHeal'] = 20;
        }
        if(this.region==='factory'){
            const b=2+Math.floor(Math.random()*3);
            addInventory('part_circuit',b); addInventory('mat_metal',b+4);
            bonus['part_circuit']=(bonus['part_circuit']??0)+b;
            bonus['mat_metal']=(bonus['mat_metal']??0)+b+4;
            // 🏭 工厂：金属/零件类物品数量+50%
            for(const[id,qty] of Object.entries(this.backpack)){
                if(id.startsWith('mat_metal')||id.startsWith('part_')){
                    const extra=Math.floor(qty*0.5);
                    if(extra>0){ addInventory(id,extra); bonus[id]=(bonus[id]??0)+extra; }
                }
            }
        }
        // 🎖️ 军事基地：额外战利品
        if(this.region==='military'){
            const r=REGIONS[this.region];
            const extraCount=2+Math.floor(Math.random()*3);
            for(let i=0;i<extraCount;i++){
                const id=r.loot[Math.floor(Math.random()*r.loot.length)];
                addInventory(id,1);
                bonus[id]=(bonus[id]??0)+1;
            }
        }
        this.depletion[this.region]=Math.min(100,this.depletion[this.region]+5+Math.random()*15);
        this.completeFlag=true;
        this.active=false;
        this.lastBonus = bonus;
        return{...this.backpack,...bonus};
    }

    attackEnemy(index: number): string|null {
        const alive = this.enemies.filter(e=>!e.dead);
        if(index<0||index>=alive.length) return null;
        const e=alive[index];
        const dmg=5+Math.floor(Math.random()*15);
        e.hp-=dmg;
        if(e.hp<=0){
            e.dead=true;
            this.noise=Math.max(0,this.noise-15);
            return '敌人被消灭！';
        }
        return `造成 ${dmg} 伤害`;
    }

    enemyName(type: string): string {
        const names: Record<string,string>={
            frozen:'冻饿者',wolf:'变异狼',raider:'掠夺者',bear:'变异熊',
            scavenger:'拾荒者',bat:'变异蝙蝠',hound:'变异猎犬',
        };
        return names[type]??type;
    }

    itemWeight(id: string): number {
        if(id.startsWith('mat_metal')||id.startsWith('fuel_propane')||id==='part_motor') return 3;
        if(id.startsWith('mat_')||id.startsWith('fuel_coal')||id==='food_ration'||id.startsWith('part_bearing')||id.startsWith('part_chip')) return 2;
        return 1;
    }

    itemRarity(id: string): number {
        if(id.startsWith('blueprint_')||id==='fuel_propane'||id==='part_motor'||id==='part_chip'||id==='part_bearing'||id==='med_stimulant') return 2;
        if(id.startsWith('med_')||id.startsWith('part_')||id==='food_chocolate'||id==='food_vitamin'||id==='food_ration') return 1;
        return 0;
    }

    itemName(id: string): string {
        const names: Record<string,string>={
            food_can:'罐头',food_bread:'面包',food_veg:'蔬菜',food_meat_frozen:'冻肉',
            food_ration:'军用干粮',food_soup:'即食汤包',food_mushroom:'干菌菇',food_chocolate:'巧克力',food_vitamin:'维生素片',
            fuel_wood:'木材',fuel_coal:'煤炭',fuel_propane:'丙烷罐',
            mat_wood:'木板',mat_metal:'金属',mat_insulation:'保温材',mat_glass:'玻璃',mat_soil:'土壤',mat_foam:'泡沫板',
            med_bandage:'绷带',med_antibiotic:'抗生素',med_frostbite:'冻伤膏',med_firstaid:'急救包',
            med_painkiller:'止痛药',med_stimulant:'兴奋剂',med_herb:'药草',
            part_battery:'电池',part_wire:'电线',part_circuit:'电路板',part_motor:'马达',part_chip:'芯片',part_bearing:'精密轴承',
            story_note:'笔记',story_diary:'日记',
            blueprint_coal:'煤炉蓝图',blueprint_greenhouse:'温室蓝图',blueprint_boiler:'锅炉蓝图',blueprint_radio:'无线电蓝图',
        };
        return names[id]??id;
    }
}
