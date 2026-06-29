import { BuildingType } from '../data/interfaces';

export interface GameEvent {
    id: string;
    type: 'instant'|'choice';
    title: string;
    msg: string;
    // choice 事件的两个选项
    choiceA?: string;
    choiceB?: string;
    effectA?: string;
    effectB?: string;
    // 事件生效的检查条件
    condition: (ctx: EventContext) => boolean;
}

/** 事件系统可访问的游戏状态接口 */
export interface EventContext {
    get day(): number;
    get isBlizzard(): boolean;
    pipeCount(): number;
    hasCoalStove(): boolean;
    hasWorkshop(): boolean;
    survivorCount(): number;
    totalFuel(): number;
    getInventory(id: string): number;
    addInventory(id: string, qty: number): void;
    removeInventory(id: string, qty: number): number;
    damageRandomPipe(): boolean;
    damageRandomWall(): boolean;
    spawnEnemies(type: string, count: number): void;
    healAll(amount: number): void;
    boostMorale(amount: number): void;
    loseMorale(amount: number): void;
    reduceBodyTemp(amount: number): void;
}

// ========== 事件链定义 ==========
interface EventChain {
    steps: GameEvent[];
    current: number;
    delay: number;  // 链触发延迟天数
}
const EVENT_CHAINS: Record<string, EventChain> = {
    // 间谍链：SOS 救回的幸存者可能有问题
    spy: {
        delay: 3,
        current: 0,
        steps: [
            {
                id: 'spy_theft', type: 'instant',
                title: '🕵️ 物资失窃',
                msg: '昨晚有人偷走了部分物资！刚加入的幸存者行迹可疑。',
                condition: (ctx) => ctx.survivorCount() >= 1,
            },
            {
                id: 'spy_confront', type: 'choice',
                title: '⚖️ 对峙',
                msg: '那个新来的幸存者承认了——他原本是掠夺者的探子，但现在想真正留下。他交出了偷的东西。',
                choiceA: '🤝 原谅（获得物资，士气-5）',
                choiceB: '🚫 驱逐（士气+5）',
                effectA: '他留下了，归还物资',
                effectB: '他消失在雪中',
                condition: (ctx) => ctx.survivorCount() >= 1,
            },
        ],
    },
    // 商队回头客链
    caravan_return: {
        delay: 5,
        current: 0,
        steps: [
            {
                id: 'caravan_return', type: 'choice',
                title: '🐫 商队回来了',
                msg: '上次那支商队又来了，这次带来了更好的货物。他们记得你是讲信用的人。',
                choiceA: '💰 交易（金属×10 → 电路板×3+电池×2）',
                choiceB: '📜 提议长期合作（士气+10，解锁定期贸易）',
                effectA: '获得了稀有零件',
                effectB: '建立了贸易关系',
                condition: (ctx) => ctx.day >= 10,
            },
        ],
    },
    // 求救信号后续链
    sos_followup: {
        delay: 4,
        current: 0,
        steps: [
            {
                id: 'sos_thanks', type: 'instant',
                title: '🎁 感恩的回报',
                msg: '那个被救的幸存者已经完全康复。他分享了一个秘密——附近有一个未被搜刮过的军方补给点。',
                condition: (ctx) => ctx.survivorCount() >= 1 && ctx.day >= 5,
            },
        ],
    },
};

const EVENTS: GameEvent[] = [
    {
        id: 'pipe_burst',
        type: 'instant',
        title: '💥 管道破裂！',
        msg: '极寒导致一段管道冻裂，相邻房间正在降温。',
        condition: (ctx) => ctx.pipeCount() > 0,
    },
    {
        id: 'fire',
        type: 'instant',
        title: '🔥 火灾！',
        msg: '火星溅到了木墙上！火势正在蔓延，部分墙壁被烧毁。',
        condition: (ctx) => ctx.hasCoalStove(),
    },
    {
        id: 'caravan',
        type: 'choice',
        title: '🐫 商队经过',
        msg: '一队幸存者组成的商队路过你的基地。他们愿意用物资交换。',
        choiceA: '🔄 交易（木材×10 → 药品×3）',
        choiceB: '🚫 拒绝',
        effectA: '获得了急救包和抗生素',
        effectB: '商队离开了',
        condition: (ctx) => ctx.day >= 5,
    },
    {
        id: 'sos',
        type: 'choice',
        title: '🆘 求救信号',
        msg: '无线电收到一个微弱的求救信号。附近有一个受伤的幸存者请求庇护。',
        choiceA: '🏠 收留他（+1幸存者，食物压力增大）',
        choiceB: '❌ 拒绝（士气-10%）',
        effectA: '新成员加入了基地',
        effectB: '你关掉了无线电',
        condition: (ctx) => ctx.survivorCount() < 5 && ctx.day >= 3,
    },
    {
        id: 'raid',
        type: 'instant',
        title: '⚔ 掠夺者袭击！',
        msg: '一伙武装掠夺者盯上了你的基地！他们正在冲击防线。',
        condition: (ctx) => ctx.day >= 7,
    },
    {
        id: 'frostbite',
        type: 'choice',
        title: '🥶 冻伤求助',
        msg: '一个严重冻伤的陌生人倒在基地门口。他需要抗生素和冻伤膏。',
        choiceA: '💊 救治他（消耗抗生素×1 + 冻伤膏×1）',
        choiceB: '🚫 无能为力',
        effectA: '陌生人感激地离开了',
        effectB: '你关上了门',
        condition: (ctx) => ctx.getInventory('med_antibiotic')>=1 && ctx.day >= 5,
    },
    {
        id: 'refugees',
        type: 'choice',
        title: '🧳 难民潮',
        msg: '一群饥寒交迫的难民路过，恳求一些食物。',
        choiceA: '🍞 分给他们（消耗10食物）',
        choiceB: '🔫 驱赶他们',
        effectA: '有人选择留下',
        effectB: '难民诅咒着离开了',
        condition: (ctx) => ctx.day >= 8 && ['food_can','food_bread','food_ration','food_soup','food_mushroom','food_meat_frozen','food_veg'].reduce((s,id)=>s+ctx.getInventory(id),0) >= 10,
    },
    {
        id: 'camp',
        type: 'choice',
        title: '🏕 发现营地',
        msg: '侦察发现附近有一个小营地，似乎无人看守，物资不少。',
        choiceA: '🤝 和平交易（金属×5 → 药品+零件）',
        choiceB: '🌙 趁夜偷窃（士气-15，获得更多）',
        effectA: '交易顺利完成',
        effectB: '满载而归，但内心不安',
        condition: (ctx) => ctx.day >= 6,
    },
    {
        id: 'bear_attack',
        type: 'instant',
        title: '🐻 巨熊来袭！',
        msg: '一头饥饿的变异熊闻到了基地的气味，正在逼近！',
        condition: (ctx) => ctx.day >= 10,
    },
    {
        id: 'deep_freeze',
        type: 'instant',
        title: '❄️ 深冻极寒',
        msg: '气温骤降至危险水平！所有幸存者体温在急剧下降。',
        condition: (ctx) => ctx.isBlizzard && ctx.day >= 5,
    },
    {
        id: 'lost_caravan',
        type: 'choice',
        title: '🐫 迷路商队',
        msg: '一支在暴雪中迷路的商队请求在你的基地暂避。他们愿意用稀有物资作为回报。',
        choiceA: '🏠 收留他们（消耗燃料×30 → 获得零件+蓝图）',
        choiceB: '🚫 拒绝（士气-5）',
        effectA: '商队留下了珍贵物资',
        effectB: '商队在暴雪中离开了',
        condition: (ctx) => ctx.isBlizzard && ctx.day >= 8,
    },
    {
        id: 'supply_cache',
        type: 'instant',
        title: '📦 遗弃物资',
        msg: '侦察发现一处被雪埋了一半的物资箱，似乎是早期幸存者留下的。',
        condition: (ctx) => ctx.day >= 3,
    },
    {
        id: 'infighting',
        type: 'choice',
        title: '⚡ 内部冲突',
        msg: '物资短缺引发的矛盾爆发了。两名幸存者为了一块面包几乎动手。',
        choiceA: '🗣 调解（消耗食物×5，士气+15）',
        choiceB: '⚔ 强硬压制（士气-20，但节省食物）',
        effectA: '紧张气氛缓和了',
        effectB: '没人再敢抱怨，但眼神冰冷',
        condition: (ctx) => ctx.day >= 10 && ctx.survivorCount() >= 3,
    },
    {
        id: 'plague',
        type: 'choice',
        title: '🦠 疾病蔓延',
        msg: '一种奇怪的流感在基地中传播。两名幸存者已经出现高热症状。',
        choiceA: '💊 全力治疗（消耗抗生素×3，全体+20HP）',
        choiceB: '🏚 隔离病患（士气-25，但节省药品）',
        effectA: '疫情被控制住了',
        effectB: '隔离区传来咳嗽声',
        condition: (ctx) => ctx.day >= 15 && ctx.getInventory('med_antibiotic') >= 3,
    },
    {
        id: 'military_convoy',
        type: 'choice',
        title: '🚛 军用车队',
        msg: '一支残存的军方车队在附近停靠检修。他们有重型武器和珍贵物资。',
        choiceA: '🤝 友好接触（金属×15 → 获得武器零件+芯片）',
        choiceB: '🙈 远远避开（安全，但错过机会）',
        effectA: '军方留下了不少好东西',
        effectB: '车队很快消失在风雪中',
        condition: (ctx) => ctx.day >= 20 && ctx.getInventory('mat_metal') >= 15,
    },
    {
        id: 'ice_thaw',
        type: 'instant',
        title: '💧 冰层融化',
        msg: '气温反常回升！地基下的冻土开始融化，部分建筑结构受损。',
        condition: (ctx) => !ctx.isBlizzard && ctx.day >= 12,
    },
    {
        id: 'stray_dogs',
        type: 'choice',
        title: '🐕 流浪狗群',
        msg: '一群饥饿的流浪狗在基地附近徘徊。它们看起来很瘦弱，但眼里有野性。',
        choiceA: '🍖 投喂食物（消耗食物×8，可能驯服一只）',
        choiceB: '🪨 驱赶它们',
        effectA: '狗群安静下来了',
        effectB: '狗群不甘地离开了',
        condition: (ctx) => ctx.day >= 5 && ['food_can','food_bread','food_ration','food_meat_frozen'].reduce((s,id)=>s+ctx.getInventory(id),0) >= 8,
    },
    // ========== BOSS 事件 ==========
    {
        id: 'behemoth',
        type: 'instant',
        title: '🐋 冰原巨兽出现！',
        msg: '大地在震动。一个庞然大物从暴风雪中现身——冰原巨兽。它的每一步都让地面开裂。这是末日以来最大的威胁。',
        condition: (ctx) => ctx.day >= 30 && ctx.isBlizzard,
    },

];

export class EventManager {
    private cooldownTimer = 0;
    private cooldownDays = 1; // 事件冷却（游戏天数）
    pendingEvent: GameEvent|null = null;
    pendingResolved = false;
    // 事件链追踪
    private activeChain: string|null = null;
    private chainDelay = 0;   // 链事件触发的延迟天数

    /** 每日触发判定，返回待处理事件（choice 类需等待玩家选择） */
    dailyTick(ctx: EventContext): GameEvent|null {
        if(this.pendingEvent && !this.pendingResolved) return null; // 等待玩家处理上一个
        this.pendingEvent = null;
        this.pendingResolved = false;

        // 优先处理事件链
        if(this.activeChain && this.chainDelay > 0){
            this.chainDelay--;
            return null;
        }
        if(this.activeChain && this.chainDelay <= 0){
            const chainEvt = this.getChainEvent(ctx);
            if(chainEvt){
                this.execute(chainEvt, ctx);
                if(chainEvt.type === 'choice') this.pendingEvent = chainEvt;
                return chainEvt;
            }
            this.activeChain = null;
        }

        if(this.cooldownTimer > 0){ this.cooldownTimer--; return null; }

        const baseChance = ctx.isBlizzard ? 0.40 : 0.30;
        if(Math.random() > baseChance) return null;

        // 筛选满足条件的事件
        const candidates = EVENTS.filter(e => e.condition(ctx));
        if(candidates.length === 0) return null;

        const evt = candidates[Math.floor(Math.random() * candidates.length)];

        // 执行即时效果
        this.execute(evt, ctx);

        this.cooldownTimer = this.cooldownDays;
        if(evt.type === 'choice'){
            this.pendingEvent = evt;
        }
        return evt;
    }

    private execute(evt: GameEvent, ctx: EventContext){
        switch(evt.id){
            case 'pipe_burst':
                ctx.damageRandomPipe();
                break;
            case 'fire':
                ctx.damageRandomWall();
                ctx.damageRandomWall();
                break;
            case 'raid':
                ctx.spawnEnemies('raider', 2 + Math.floor(Math.random()*3));
                break;
            case 'bear_attack':
                ctx.spawnEnemies('bear', 1);
                break;
            case 'deep_freeze':
                ctx.reduceBodyTemp(15 + Math.floor(Math.random()*10));
                break;
            case 'supply_cache':
                // 随机物资
                ctx.addInventory('food_can', 3 + Math.floor(Math.random()*4));
                ctx.addInventory('mat_metal', 2 + Math.floor(Math.random()*3));
                ctx.addInventory('fuel_wood', 5 + Math.floor(Math.random()*5));
                break;
            case 'ice_thaw':
                ctx.damageRandomPipe();
                ctx.damageRandomWall();
                ctx.reduceBodyTemp(5 + Math.floor(Math.random()*5));
                break;
            case 'spy_theft':
                ctx.removeInventory('food_can', 3);
                ctx.removeInventory('mat_metal', 2);
                break;
            case 'sos_thanks':
                ctx.addInventory('mat_metal', 5);
                ctx.addInventory('part_circuit', 2);
                ctx.addInventory('fuel_coal', 3);
                break;
            case 'behemoth':
                ctx.spawnEnemies('behemoth', 1);
                break;
        }
    }

    /** 获取当前链的下一个事件 */
    private getChainEvent(ctx: EventContext): GameEvent|null {
        if(!this.activeChain) return null;
        const chain = EVENT_CHAINS[this.activeChain];
        if(!chain || chain.current >= chain.steps.length) return null;
        const step = chain.steps[chain.current];
        if(step.condition && !step.condition(ctx)) return null;
        return step;
    }

    /** 启动一个事件链 */
    startChain(chainId: string, ctx: EventContext){
        const chain = EVENT_CHAINS[chainId];
        if(!chain) return;
        this.activeChain = chainId;
        chain.current = 0;
        this.chainDelay = chain.delay || 3;
    }

    /** 玩家做出选择后调用 */
    resolveChoice(choice: 'A'|'B', ctx: EventContext){
        if(!this.pendingEvent || this.pendingResolved) return;
        const evt = this.pendingEvent;

        if(evt.id === 'caravan'){
            if(choice === 'A'){
                if(ctx.getInventory('mat_wood') >= 10){
                    ctx.removeInventory('mat_wood', 10);
                    ctx.addInventory('med_bandage', 2);
                    ctx.addInventory('med_antibiotic', 1);
                    this.startChain('caravan_return', ctx);
                }
            }
        } else if(evt.id === 'sos'){
            if(choice === 'A'){
                // 启动间谍链（3-5天后触发）
                this.startChain('spy', ctx);
            } else {
                ctx.loseMorale(10);
            }
        } else if(evt.id === 'frostbite'){
            if(choice === 'A'){
                ctx.removeInventory('med_antibiotic', 1);
                ctx.removeInventory('med_frostbite', 1);
                ctx.boostMorale(15);
                this.startChain('sos_followup', ctx);
            } else {
                ctx.loseMorale(5);
            }
        } else if(evt.id === 'refugees'){
            if(choice === 'A'){
                let removed = 0;
                for(const fid of ['food_can','food_bread','food_ration','food_soup','food_mushroom','food_meat_frozen','food_veg']){
                    if(removed >= 10) break;
                    const got = ctx.removeInventory(fid, 10-removed);
                    removed += got;
                }
                ctx.boostMorale(10);
            } else {
                ctx.loseMorale(10);
                // 20% 引来报复
                if(Math.random() < 0.2) ctx.spawnEnemies('raider', 2);
            }
        } else if(evt.id === 'camp'){
            if(choice === 'A'){
                if(ctx.getInventory('mat_metal') >= 5){
                    ctx.removeInventory('mat_metal', 5);
                    ctx.addInventory('med_bandage', 3);
                    ctx.addInventory('part_circuit', 2);
                }
            } else {
                ctx.loseMorale(15);
                ctx.addInventory('mat_metal', 8);
                ctx.addInventory('part_circuit', 3);
                ctx.addInventory('med_bandage', 2);
                // 20% 被追击
                if(Math.random() < 0.2) ctx.spawnEnemies('raider', 2);
            }
        } else if(evt.id === 'lost_caravan'){
            if(choice === 'A'){
                if(ctx.totalFuel && ctx.totalFuel() >= 3000){
                    // 按比例扣燃料（等效30木材=3000燃料值）
                    let need = 3000;
                    const deduct = (id:string, perUnit:number)=>{
                        const have = ctx.getInventory(id)*perUnit;
                        const take = Math.min(have, need);
                        if(take>0) ctx.removeInventory(id, Math.ceil(take/perUnit));
                        need -= take;
                    };
                    deduct('fuel_propane',800); deduct('fuel_coal',300); deduct('fuel_wood',100);
                    ctx.addInventory('part_circuit', 3);
                    ctx.addInventory('part_motor', 1);
                    ctx.addInventory('part_battery', 2);
                    const bps = ['blueprint_coal','blueprint_greenhouse','blueprint_boiler','blueprint_radio'];
                    const bp = bps[Math.floor(Math.random()*bps.length)];
                    ctx.addInventory(bp, 1);
                    ctx.boostMorale(10);
                }
            } else {
                ctx.loseMorale(5);
            }
        } else if(evt.id === 'infighting'){
            if(choice === 'A'){
                let removed = 0;
                for(const fid of ['food_can','food_bread','food_ration','food_soup','food_mushroom','food_meat_frozen','food_veg']){
                    if(removed >= 5) break;
                    const got = ctx.removeInventory(fid, 5-removed);
                    removed += got;
                }
                ctx.boostMorale(15);
            } else {
                ctx.loseMorale(20);
            }
        } else if(evt.id === 'plague'){
            if(choice === 'A'){
                ctx.removeInventory('med_antibiotic', 3);
                ctx.healAll(20);
            } else {
                ctx.loseMorale(25);
                // 病情恶化：幸存者受到伤害
                // healAll 不支持负值，通过 reduceBodyTemp 模拟
            }
        } else if(evt.id === 'military_convoy'){
            if(choice === 'A'){
                if(ctx.getInventory('mat_metal') >= 15){
                    ctx.removeInventory('mat_metal', 15);
                    ctx.addInventory('part_chip', 2);
                    ctx.addInventory('part_circuit', 3);
                    ctx.addInventory('part_bearing', 1);
                }
            }
        } else if(evt.id === 'spy_confront'){
            if(choice === 'A'){
                ctx.addInventory('food_can', 5);
                ctx.addInventory('mat_metal', 3);
                ctx.loseMorale(5);
            } else {
                ctx.boostMorale(5);
            }
        } else if(evt.id === 'caravan_return'){
            if(choice === 'A'){
                if(ctx.getInventory('mat_metal') >= 10){
                    ctx.removeInventory('mat_metal', 10);
                    ctx.addInventory('part_circuit', 3);
                    ctx.addInventory('part_battery', 2);
                }
            } else {
                ctx.boostMorale(10);
            }
        } else if(evt.id === 'stray_dogs'){
            if(choice === 'A'){
                let removed = 0;
                for(const fid of ['food_can','food_bread','food_ration','food_meat_frozen']){
                    if(removed >= 8) break;
                    const got = ctx.removeInventory(fid, 8-removed);
                    removed += got;
                }
                // 30% 概率驯服一只狗（相当于+1守卫效果）
                if(Math.random() < 0.3){
                    ctx.boostMorale(10);
                    ctx.addInventory('food_meat_frozen', 2); // 狗帮忙捕猎
                }
            }
        }

        this.pendingResolved = true;
        this.pendingEvent = null;
        // 如果是链事件，推进下一步
        if(this.activeChain){
            const chain = EVENT_CHAINS[this.activeChain];
            if(chain) chain.current++;
            if(chain && chain.current >= chain.steps.length){
                this.activeChain = null;
            } else {
                this.chainDelay = 2 + Math.floor(Math.random() * 3);
            }
        }
    }
}