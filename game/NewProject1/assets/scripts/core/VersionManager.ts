export interface VersionMilestone {
    version: string;
    title: string;
    status: 'released' | 'in_progress' | 'planned' | 'future';
    goals: string[];
    acceptance: string[];
}

export class VersionManager {
    readonly current = 'v1.0.0-candidate';
    readonly next = 'v1.0.0';
    readonly github = 'https://github.com/QQ-L-XX/frozen-wasteland';

    readonly milestones: VersionMilestone[] = [
        {
            version: 'v1.0.0-candidate',
            title: 'GitHub 试玩候选版',
            status: 'released',
            goals: ['核心循环可跑', '仓库页面完整', '内置 QA 验证 P0'],
            acceptance: ['TypeScript 检查通过', 'P0 一周烟测通过', 'README / 发布说明 / About 完成'],
        },
        {
            version: 'v1.0.0',
            title: '稳定试玩版',
            status: 'in_progress',
            goals: ['Day 1-7 人工长测', '补真实截图', '确认存档/读档/搜刮/撤离稳定'],
            acceptance: ['Cocos 预览 Day 1-7 通过', '至少 2-4 张截图', '无 P0 阻塞 bug'],
        },
        {
            version: 'v1.1.0',
            title: '中期经营版',
            status: 'planned',
            goals: ['强化世界网络', '扩展外部哨站', '强化生产链收益'],
            acceptance: ['至少 3 条生产链有清晰收益', '哨站维护/补给反馈清晰', 'Day 10-40 有稳定目标'],
        },
        {
            version: 'v1.2.0',
            title: '角色与事件版',
            status: 'planned',
            goals: ['幸存者个人线', '关系事件', '长期灾变', '挑战剧本'],
            acceptance: ['至少 6 条角色/关系事件链', '至少 3 个长期灾变', '至少 3 个挑战剧本'],
        },
        {
            version: 'v2.0.0',
            title: '长线完整版',
            status: 'future',
            goals: ['面向 80-100 小时内容量', '补终局路线', '补可重复长期目标'],
            acceptance: ['每 10-20 天有新目标/风险', '多结局路线可追踪', '长线内容量显著扩展'],
        },
    ];

    getStatusLabel(status: VersionMilestone['status']): string {
        if(status === 'released') return '已发布';
        if(status === 'in_progress') return '进行中';
        if(status === 'planned') return '计划中';
        return '远期';
    }

    getStatusColor(status: VersionMilestone['status']): string {
        if(status === 'released') return 'var(--f-success)';
        if(status === 'in_progress') return 'var(--f-warn)';
        if(status === 'planned') return 'var(--f-text)';
        return 'var(--f-dim)';
    }
}
