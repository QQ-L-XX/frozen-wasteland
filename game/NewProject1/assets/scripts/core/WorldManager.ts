export type FactionId = 'caravan' | 'engineers' | 'freeSettlement';

export interface WorldContext {
    day: number;
    scavengesDone: number;
    radioSignals: number;
    outpostCount: number;
    hasRadio: boolean;
    hasSnowmobile: boolean;
    hasGeothermal: boolean;
}

export interface WorldStatus {
    influence: number;
    level: number;
    title: string;
    summary: string;
    factions: Record<FactionId, number>;
}

const FACTION_DEFAULTS: Record<FactionId, number> = {
    caravan: 10,
    engineers: 0,
    freeSettlement: 0,
};

const LEVEL_TITLES: Record<number, string> = {
    1: '孤立避难所',
    2: '无线电节点',
    3: '雪原补给网',
    4: '区域聚落联盟',
    5: '文明重建核心',
};

export class WorldManager {
    influence = 0;
    factions: Record<FactionId, number> = {...FACTION_DEFAULTS};

    addInfluence(amount: number) {
        this.influence = Math.max(0, Math.min(500, this.influence + amount));
    }

    addFaction(id: FactionId, amount: number) {
        this.factions[id] = Math.max(-100, Math.min(100, (this.factions[id] ?? 0) + amount));
    }

    dailyTick(ctx: WorldContext) {
        if(ctx.hasRadio) this.addInfluence(0.2);
        if(ctx.hasSnowmobile) this.addInfluence(0.1);
        if(ctx.outpostCount > 0) this.addInfluence(0.4 * ctx.outpostCount);
        if(ctx.hasGeothermal) this.addFaction('engineers', 0.2);
        if(ctx.radioSignals > 0) this.addFaction('caravan', 0.1);
    }

    getStatus(ctx: WorldContext): WorldStatus {
        const effective = this.influence + ctx.scavengesDone * 1.5 + ctx.radioSignals * 4 + ctx.outpostCount * 12;
        const level = effective >= 180 ? 5 : effective >= 110 ? 4 : effective >= 60 ? 3 : effective >= 20 ? 2 : 1;
        const title = LEVEL_TITLES[level];
        return {
            influence: Math.round(effective),
            level,
            title,
            summary: `世界Lv${level} ${title} · 影响力${Math.round(effective)}`,
            factions: {...this.factions},
        };
    }

    serialize() {
        return {
            influence: this.influence,
            factions: {...this.factions},
        };
    }

    load(data: any) {
        if(!data) return;
        if(typeof data.influence === 'number') this.influence = data.influence;
        if(data.factions) this.factions = {...FACTION_DEFAULTS, ...data.factions};
    }
}
