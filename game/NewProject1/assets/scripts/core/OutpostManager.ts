export type OutpostId = 'coal_mine' | 'scrap_depot' | 'green_farm';

export interface OutpostContext {
    day: number;
    influence: number;
    hasWorkshop: boolean;
    hasRadio: boolean;
    hasSnowmobile: boolean;
    hasGeothermal: boolean;
}

export interface OutpostDef {
    id: OutpostId;
    name: string;
    desc: string;
    unlock: string;
    cost: Record<string, number>;
    output: Record<string, number>;
    minInfluence: number;
    requires: Array<'workshop' | 'radio' | 'snowmobile' | 'geothermal'>;
}

export interface OutpostState {
    id: OutpostId;
    built: boolean;
    level: number;
    safety: number;
    maintenance: number;
    supply: number;
}

export interface OutpostProduction {
    items: Record<string, number>;
    summary: string;
    messages: string[];
}

export const OUTPOST_DEFS: OutpostDef[] = [
    {
        id: 'coal_mine',
        name: '旧煤矿',
        desc: '稳定产出煤炭，是长期供暖和工业扩张的燃料底座。',
        unlock: '需要工坊、雪地摩托、世界影响力20',
        cost: {mat_wood: 30, mat_metal: 18, fuel_coal: 10},
        output: {fuel_coal: 5},
        minInfluence: 20,
        requires: ['workshop', 'snowmobile'],
    },
    {
        id: 'scrap_depot',
        name: '废料回收站',
        desc: '拆解废弃车辆和工厂残骸，产出金属，偶尔回收电路板。',
        unlock: '需要工坊、无线电、世界影响力45',
        cost: {mat_wood: 20, mat_metal: 25, part_circuit: 3},
        output: {mat_metal: 4, part_circuit: 0.4},
        minInfluence: 45,
        requires: ['workshop', 'radio'],
    },
    {
        id: 'green_farm',
        name: '外部温室农场',
        desc: '把食物生产从室内温室扩展成聚落级农业。',
        unlock: '需要无线电、地热井、世界影响力80',
        cost: {mat_wood: 35, mat_glass: 16, mat_soil: 8, part_circuit: 4},
        output: {food_veg: 8},
        minInfluence: 80,
        requires: ['radio', 'geothermal'],
    },
];

export class OutpostManager {
    states: Record<OutpostId, OutpostState> = {
        coal_mine: {id:'coal_mine', built:false, level:1, safety:70, maintenance:80, supply:75},
        scrap_depot: {id:'scrap_depot', built:false, level:1, safety:65, maintenance:75, supply:70},
        green_farm: {id:'green_farm', built:false, level:1, safety:75, maintenance:80, supply:80},
    };
    lastProduction: OutpostProduction = {items:{}, summary:'无外部产出', messages:[]};

    getDefs() { return OUTPOST_DEFS; }
    getBuiltCount() { return Object.values(this.states).filter(s=>s.built).length; }
    getState(id: OutpostId) { return this.states[id]; }

    canBuild(id: OutpostId, ctx: OutpostContext): string | null {
        const def = OUTPOST_DEFS.find(d=>d.id===id);
        if(!def) return '未知哨站';
        const state = this.states[id];
        if(state.built) return '哨站已建立';
        if(ctx.influence < def.minInfluence) return `世界影响力不足（需${def.minInfluence}）`;
        if(def.requires.includes('workshop') && !ctx.hasWorkshop) return '需要工坊';
        if(def.requires.includes('radio') && !ctx.hasRadio) return '需要无线电室';
        if(def.requires.includes('snowmobile') && !ctx.hasSnowmobile) return '需要雪地摩托';
        if(def.requires.includes('geothermal') && !ctx.hasGeothermal) return '需要地热井';
        return null;
    }

    build(id: OutpostId) {
        const state = this.states[id];
        state.built = true;
        state.safety = Math.max(state.safety, 70);
        state.maintenance = Math.max(state.maintenance, 80);
        state.supply = Math.max(state.supply, 75);
    }

    dailyTick(): OutpostProduction {
        const items: Record<string, number> = {};
        const messages: string[] = [];
        for(const def of OUTPOST_DEFS){
            const state = this.states[def.id];
            if(!state.built) continue;
            const efficiency = Math.max(0.15, (state.safety + state.maintenance + state.supply) / 300);
            for(const [id, qty] of Object.entries(def.output)){
                items[id] = (items[id] ?? 0) + qty * state.level * efficiency;
            }
            state.safety = Math.max(10, state.safety - 0.8);
            state.maintenance = Math.max(10, state.maintenance - 1.0);
            state.supply = Math.max(10, state.supply - 0.6);
            if(state.safety < 35) messages.push(`${def.name} 安全过低，产出受影响`);
            if(state.maintenance < 35) messages.push(`${def.name} 维护不足，设备效率下降`);
        }
        const parts = Object.entries(items).map(([id, qty])=>`${id}×${Math.max(1, Math.floor(qty))}`);
        this.lastProduction = {
            items,
            summary: parts.length ? parts.join(' ') : '无外部产出',
            messages,
        };
        return this.lastProduction;
    }

    resupplyAll() {
        for(const state of Object.values(this.states)){
            if(!state.built) continue;
            state.safety = Math.min(100, state.safety + 12);
            state.maintenance = Math.min(100, state.maintenance + 14);
            state.supply = Math.min(100, state.supply + 12);
        }
    }

    serialize() {
        return {
            states: this.states,
            lastProduction: this.lastProduction,
        };
    }

    load(data: any) {
        if(!data) return;
        if(data.states) this.states = {...this.states, ...data.states};
        if(data.lastProduction) this.lastProduction = data.lastProduction;
    }
}
