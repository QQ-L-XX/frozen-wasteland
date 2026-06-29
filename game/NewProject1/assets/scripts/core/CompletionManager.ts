import { BuildingType } from '../data/interfaces';

export interface CompletionContext {
    day: number;
    survivorCount: number;
    food: number;
    fuel: number;
    buildings: Record<string, number>;
    vehicle: string | null;
    scavengesDone: number;
    worldInfluence: number;
    outpostCount: number;
    productionChains: number;
    radioSignals: number;
    endingTriggered: boolean;
    hasSave: boolean;
    saveLoadVerified: boolean;
}

export interface CompletionItem {
    id: string;
    title: string;
    detail: string;
    done: boolean;
    priority: 'P0'|'P1'|'P2';
    action: string;
}

export interface CompletionStatus {
    score: number;
    grade: string;
    nextAction: string;
    items: CompletionItem[];
    risks: string[];
}

export class CompletionManager {
    getStatus(ctx: CompletionContext): CompletionStatus {
        const b = ctx.buildings;
        const items: CompletionItem[] = [
            { id:'survive_week', priority:'P0', title:'第一周闭环', detail:'存活到第 7 天，确认基础消耗和事件节奏能跑通。', action:'继续运行到第 7 天，观察食物、燃料、体温和事件弹窗。', done: ctx.day >= 7 },
            { id:'basic_base', priority:'P0', title:'基础基地', detail:'至少 4 张床、1 个温室、1 个工坊，覆盖早期建造目标。', action:'建床位、温室和工坊；材料不足先搜郊区/商业街。', done: (b[BuildingType.BED_MATTRESS]??0)>=4 && (b[BuildingType.FACILITY_GREENHOUSE]??0)>0 && (b[BuildingType.FACILITY_WORKSHOP]??0)>0 },
            { id:'heat_core', priority:'P0', title:'供暖核心', detail:'建造煤炉或锅炉，确保中期不只靠初始木材。', action:'建煤炉；拿到锅炉蓝图后建锅炉并检查室温变化。', done: (b[BuildingType.FACILITY_COALSTOVE]??0)>0 || (b[BuildingType.FACILITY_BOILER]??0)>0 },
            { id:'scavenge_loop', priority:'P0', title:'搜刮完整流程', detail:'至少完成 3 次搜刮，覆盖进入、探索、撤离、结算。', action:'从郊区开始搜刮，测试移动、捡物、遇敌、撤离和结算。', done: ctx.scavengesDone >= 3 },
            { id:'save_roundtrip', priority:'P0', title:'存档读档可用', detail:'完成过一次保存/读取或 QA 往返，确认读档后 UI、资源和蓝图状态仍可用。', action:'用系统菜单保存后读取，或在控制台执行 window._frostDebug.roundtrip()。', done: ctx.saveLoadVerified },
            { id:'vehicle_unlock', priority:'P1', title:'远征载具', detail:'建造雪橇或雪地摩托，让中期区域解锁有推进感。', action:'基地菜单建雪橇，再试商业街、荒野、仓储区。', done: !!ctx.vehicle },
            { id:'radio_world', priority:'P1', title:'通讯与世界', detail:'建造无线电或世界影响力达到 25，打开外部网络。', action:'解读无线电蓝图，建无线电室，使用扫描。', done: (b[BuildingType.FACILITY_RADIO]??0)>0 || ctx.worldInfluence >= 25 },
            { id:'outpost_chain', priority:'P1', title:'外部哨站', detail:'建立至少 1 个外部哨站，验证资源从搜刮转向经营。', action:'打开世界面板，优先建设旧煤矿或废料回收站。', done: ctx.outpostCount >= 1 },
            { id:'production_chain', priority:'P1', title:'生产链', detail:'激活至少 1 条生产链，验证中期目标不空转。', action:'建工坊和哨站后检查长线/世界面板里的生产链摘要。', done: ctx.productionChains >= 1 },
            { id:'late_heat', priority:'P2', title:'长期供暖', detail:'建造地热井，验证后期供暖路线。', action:'建锅炉后解锁地热井，检查燃料压力是否下降。', done: (b[BuildingType.FACILITY_GEOTHERMAL]??0)>0 },
            { id:'ending_path', priority:'P2', title:'结局路径', detail:'触发任意结局或进入第 120 天后长期阶段。', action:'保留存档后推进到中后期，验证结局弹窗和统计页面。', done: ctx.endingTriggered || ctx.day >= 120 },
        ];

        const score = Math.round(items.filter(i=>i.done).length / items.length * 100);
        const next = items.find(i=>!i.done);
        const risks: string[] = [];
        if(ctx.survivorCount <= 0) risks.push('没有幸存者，需验证失败结局和返回标题流程。');
        if(ctx.food < 20) risks.push('食物低于 20，容易遮蔽中后期测试。');
        if(ctx.fuel < 800) risks.push('燃料偏低，建议先验证供暖核心或补给链。');
        if(ctx.scavengesDone === 0) risks.push('尚未完成搜刮闭环，这是当前最关键的 P0 测试点。');
        if(!ctx.hasSave) risks.push('还没有本地存档，保存/读取必须在 v1.0 前实测。');
        else if(!ctx.saveLoadVerified) risks.push('已有存档，但还没有确认读档往返成功。');

        return {
            score,
            grade: score >= 90 ? 'v1 候选' : score >= 70 ? '收束中' : score >= 45 ? '可玩原型' : '待验证',
            nextAction: next ? `${next.priority}：${next.action}` : '所有 v1 收束项已完成，进入发行打磨和长测。',
            items,
            risks,
        };
    }
}
