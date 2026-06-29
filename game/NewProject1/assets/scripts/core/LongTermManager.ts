import { BuildingType } from '../data/interfaces';

export interface LongTermContext {
    day: number;
    survivorCount: number;
    food: number;
    totalFuel: number;
    buildings: Record<string, number>;
    vehicle: string | null;
    radioSignals: number;
    scavengesDone: number;
    worldInfluence: number;
    outpostCount: number;
    productionChains: number;
}

export interface LongTermGoal {
    id: string;
    title: string;
    desc: string;
    done: boolean;
}

export interface LongTermStatus {
    level: number;
    name: string;
    summary: string;
    goals: LongTermGoal[];
    nextGoal: LongTermGoal | null;
}

const LEVEL_NAMES: Record<number, string> = {
    1: '避难所',
    2: '稳定营地',
    3: '雪原据点',
    4: '地下聚落',
    5: '新文明核心',
};

export class LongTermManager {
    route: 'undecided'|'geothermal'|'evacuation'|'alliance'|'research' = 'undecided';

    getStatus(ctx: LongTermContext): LongTermStatus {
        const level = this.getLevel(ctx);
        const goals = this.getGoals(ctx);
        const nextGoal = goals.find(g=>!g.done) ?? null;
        return {
            level,
            name: LEVEL_NAMES[level],
            summary: `Lv${level} ${LEVEL_NAMES[level]} · ${this.getPhaseHint(level)}`,
            goals,
            nextGoal,
        };
    }

    serialize() {
        return { route: this.route };
    }

    load(data: any) {
        if(data?.route) this.route = data.route;
    }

    private getLevel(ctx: LongTermContext): number {
        const b = ctx.buildings;
        const hasBeds = (b[BuildingType.BED_MATTRESS] ?? 0) >= 4;
        const hasBoiler = (b[BuildingType.FACILITY_BOILER] ?? 0) > 0;
        const hasMotor = ctx.vehicle === 'snowmobile';
        const hasGeothermal = (b[BuildingType.FACILITY_GEOTHERMAL] ?? 0) > 0;
        const hasRadio = (b[BuildingType.FACILITY_RADIO] ?? 0) > 0;
        const hasGreenhouse = (b[BuildingType.FACILITY_GREENHOUSE] ?? 0) > 0;

        if(hasRadio && hasGeothermal && hasGreenhouse && ctx.survivorCount >= 8 && ctx.day >= 120) return 5;
        if(hasGeothermal && ctx.survivorCount >= 6) return 4;
        if(hasBoiler && hasMotor) return 3;
        if(ctx.day >= 7 && hasBeds && hasGreenhouse) return 2;
        return 1;
    }

    private getPhaseHint(level: number): string {
        if(level === 1) return '活过第一周';
        if(level === 2) return '稳定食物与供暖';
        if(level === 3) return '走出基地，建立远征能力';
        if(level === 4) return '建设地下聚落与长期生产';
        return '选择文明终局路线';
    }

    private getGoals(ctx: LongTermContext): LongTermGoal[] {
        const b = ctx.buildings;
        const beds = b[BuildingType.BED_MATTRESS] ?? 0;
        const greenhouse = b[BuildingType.FACILITY_GREENHOUSE] ?? 0;
        const boiler = b[BuildingType.FACILITY_BOILER] ?? 0;
        const workshop = b[BuildingType.FACILITY_WORKSHOP] ?? 0;
        const radio = b[BuildingType.FACILITY_RADIO] ?? 0;
        const geothermal = b[BuildingType.FACILITY_GEOTHERMAL] ?? 0;
        const turret = b[BuildingType.DEFENSE_TURRET] ?? 0;

        return [
            {
                id: 'week_one',
                title: '活过第一周',
                desc: '存活到 Day 7，并保证基地有基础床位。',
                done: ctx.day >= 7 && beds >= 4,
            },
            {
                id: 'food_loop',
                title: '建立食物循环',
                desc: '建造温室，并储备 80 以上食物。',
                done: greenhouse > 0 && ctx.food >= 80,
            },
            {
                id: 'heat_loop',
                title: '升级供暖核心',
                desc: '建造锅炉，让基地从临时取暖进入稳定供暖。',
                done: boiler > 0,
            },
            {
                id: 'expedition',
                title: '形成远征能力',
                desc: '建造雪地摩托，并完成至少 5 次搜刮。',
                done: ctx.vehicle === 'snowmobile' && ctx.scavengesDone >= 5,
            },
            {
                id: 'industry',
                title: '建立工程基础',
                desc: '建造工坊，为生产链和高级工程做准备。',
                done: workshop > 0,
            },
            {
                id: 'defense',
                title: '自动化防线',
                desc: '建造炮塔或等效防御，降低袭击压力。',
                done: turret > 0,
            },
            {
                id: 'network',
                title: '重建通讯',
                desc: '建造无线电室并累计收到 3 次有效信号。',
                done: radio > 0 && ctx.radioSignals >= 3,
            },
            {
                id: 'underground',
                title: '地下聚落',
                desc: '建造地热井，支撑长期无燃料供暖。',
                done: geothermal > 0,
            },
            {
                id: 'world_network',
                title: '建立外部网络',
                desc: '世界影响力达到 60，并建立至少 2 个外部哨站。',
                done: ctx.worldInfluence >= 60 && ctx.outpostCount >= 2,
            },
            {
                id: 'production_chain',
                title: '中期生产链',
                desc: '激活至少 2 条生产链，让基地从搜刮转入经营。',
                done: ctx.productionChains >= 2,
            },
            {
                id: 'civilization',
                title: '新文明核心',
                desc: '人口达到 8 人，存活 120 天，进入文明重建阶段。',
                done: ctx.survivorCount >= 8 && ctx.day >= 120 && geothermal > 0 && radio > 0 && ctx.outpostCount >= 3,
            },
        ];
    }
}
