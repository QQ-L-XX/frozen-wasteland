export interface ProductionContext {
    hasWorkshop: boolean;
    hasBoiler: boolean;
    hasGeothermal: boolean;
    outpostCount: number;
    coalMineBuilt: boolean;
    scrapDepotBuilt: boolean;
    greenFarmBuilt: boolean;
}

export interface ProductionChain {
    id: string;
    name: string;
    desc: string;
    active: boolean;
}

export interface ProductionStatus {
    activeCount: number;
    chains: ProductionChain[];
    summary: string;
}

export class ProductionManager {
    getStatus(ctx: ProductionContext): ProductionStatus {
        const chains: ProductionChain[] = [
            {
                id: 'heat_industry',
                name: '燃料工业',
                desc: '旧煤矿 + 锅炉，支撑长期供暖和工业扩张。',
                active: ctx.coalMineBuilt && ctx.hasBoiler,
            },
            {
                id: 'scrap_industry',
                name: '废料工程',
                desc: '回收站 + 工坊，稳定获得金属和电子零件。',
                active: ctx.scrapDepotBuilt && ctx.hasWorkshop,
            },
            {
                id: 'food_industry',
                name: '聚落农业',
                desc: '外部温室农场 + 地热井，形成聚落级食物循环。',
                active: ctx.greenFarmBuilt && ctx.hasGeothermal,
            },
        ];
        const activeCount = chains.filter(c=>c.active).length;
        return {
            activeCount,
            chains,
            summary: `生产链 ${activeCount}/${chains.length} · 哨站 ${ctx.outpostCount}/3`,
        };
    }

    serialize() {
        return {};
    }

    load(_data: any) {
        return;
    }
}
