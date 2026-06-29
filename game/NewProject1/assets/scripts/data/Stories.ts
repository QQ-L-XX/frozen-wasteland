// 极寒末世 — 叙事内容库

export interface StoryEntry {
    id: string;
    title: string;
    type: 'note'|'diary'|'log';
    author: string;
    text: string;
    hint?: string;
}

export const STORIES: StoryEntry[] = [
    {
        id: 'note_01', title: '皱巴巴的便条', type: 'note', author: '未知',
        text: '如果你看到这张纸条——往北走。我们在旧罐头厂设立了临时避难所。食物不多了，但至少墙还在。别走南边，那里的桥断了。',
        hint: '旧罐头厂可能是个搜刮点',
    },
    {
        id: 'note_02', title: '写在烟盒背面的字', type: 'note', author: 'M',
        text: '今天是第 31 天。燃料没了，无线电也坏了。汤姆说他听到了北边有机器声，可能是军方的扫雪车。我不太信，但别无选择。',
    },
    {
        id: 'note_03', title: '医用手册残页', type: 'note', author: '圣玛丽医院·护理部',
        text: '冻伤处理标准流程：1. 用 38-42°C 温水浸泡 20 分钟。2. 涂抹冻伤膏，覆盖无菌敷料。3. 严禁揉搓或直接用火烤。附：抗生素存货在 B 栋地下 1 层药房。',
        hint: '医院 B 栋地下可能有抗生素',
    },
    {
        id: 'note_04', title: '儿童涂鸦', type: 'note', author: '小艾',
        text: '妈妈说明天就能回家了。我画了我们家的房子，还有狗狗。爸爸说狗狗在雪里睡着了，不会再醒来了。我不明白，它明明只是在睡觉。',
    },
    {
        id: 'note_05', title: '工厂值班记录', type: 'note', author: '第四车间·李工',
        text: '夜班记录（第 15 天）：蒸汽管道压力正常，3 号锅炉满负荷。凌晨 3:12 听到南墙外有异常动静。仓库还有至少 20 桶燃油，别让外人知道。',
        hint: '废弃工厂仓库可能有燃油储备',
    },
    {
        id: 'diary_01', title: '幸存者日记（一）', type: 'diary', author: '艾琳',
        text: '第 12 天。我们还剩六个人。戴维昨天出去找药，到现在还没回来。我偷偷藏了一罐维生素片在床底下——不是为了贪心，是为了万一只剩我自己。',
    },
    {
        id: 'diary_02', title: '幸存者日记（二）', type: 'diary', author: '艾琳',
        text: '第 47 天。戴维回来了。他瘦了一大圈，但带着抗生素。他说医院那边有个无线电塔，也许能修好。我们都觉得应该去试试。明天出发。',
        hint: '医院附近可能有无线电塔',
    },
    {
        id: 'diary_03', title: '研究员日志', type: 'log', author: '极地研究所·陈博士',
        text: '实验日志 #108。温度持续低于预期。温室里的耐寒作物样本是目前唯一的好消息——它们在 -5°C 下仍然存活。如果最坏情况发生，这些种子可能是最后的希望。样本存放在 3 号冷库。',
    },
    {
        id: 'diary_04', title: '最后的无线电记录', type: 'log', author: '应急广播',
        text: '这里是应急广播系统，自动播报。极端寒潮将在 72 小时内覆盖整个区域。寻找避难所，储存至少两周的食物和燃料。医院和学校已开放为公共避难所。保持冷静。',
    },
    {
        id: 'diary_05', title: '老兵的回忆录', type: 'diary', author: '退役中士·赵',
        text: '我这辈子见过很多次危机。洪水、地震、战争——但从来没有像这次一样安静。雪把一切都盖住了。有时候安静比炮火更可怕。我已经六十岁了，但我还想再活一年。看看春天还能不能回来。',
    },
    // ========== 幸存者背景故事 ==========
    {
        id: 'bg_veteran', title: '老兵的过往', type: 'diary', author: '老兵',
        text: '我叫赵建国，服役二十三年。最后一次任务是护送一列补给车穿过冰原——那时我们以为还能赢。车队被伏击了，我是唯一的幸存者。\n\n现在我只剩这把旧手枪和一堆勋章。勋章在雪地里不值一文，但枪还能用。只要还有一个活人需要保护，我就没有退役。',
    },
    {
        id: 'bg_tech', title: '技师的秘密', type: 'diary', author: '技师',
        text: '我叫林小禾——不，现在应该叫"技师"。没人问过我的真名，也没人需要知道。\n\n灾难前我是发电厂的维修工。那天我正在修 3 号涡轮，警报响了。所有人都往南跑，只有我往北——因为控制室还有人没收到通知。等我赶到时，大门已经锁了。\n\n从那以后，我发誓：不会再让任何人被锁在门外。',
    },
    {
        id: 'bg_doctor', title: '医生的誓言', type: 'diary', author: '医生',
        text: '苏晴，三甲医院急诊科主治医师。灾难第一天我就失去了两个病人——不是死于寒冷，而是因为停电导致呼吸机停转。\n\n我的手在颤抖，不是因为冷。是因为我明明知道怎么救他们，却什么都做不了。\n\n所以我开始收集药品、记录配方、教别人基本的包扎。末日里外科手术做不了，但至少可以让更多人撑到明天。这是我的誓言——只要是活人，我就会治。',
    },
    // ========== 通用背景故事（随机幸存者模式）==========
    {
        id: 'bg_story_1', title: '冰原上的回忆', type: 'diary', author: '幸存者',
        text: '有时候我会想起灾难前的事。那时候觉得无聊的日常——等公交、排队买咖啡、抱怨天气——现在想起来都像上辈子的梦。\n\n我们失去了一切。但至少还活着。这就够了。',
    },
    {
        id: 'bg_story_2', title: '未寄出的信', type: 'diary', author: '幸存者',
        text: '我在废墟里找到了一支还能用的笔和几张纸。我想写封信，但不知道写给谁。写了一半又撕了——有些话说了也没人听。\n\n但明天我还会继续写。也许有一天，会有人读到。',
    },
    {
        id: 'bg_story_3', title: '夜晚的约定', type: 'diary', author: '幸存者',
        text: '每天晚上我们轮流守夜。不是怕掠夺者——是怕自己熬不过去。\n\n有人提议：如果春天真的来了，我们一起种一棵树。随便什么树都行。\n\n这个约定支撑我度过了最难的那些夜晚。',
    },
];

export function getStoryForRegion(region: string): StoryEntry|null {
    const pool = STORIES.filter(s => {
        if(region==='hospital') return s.hint?.includes('医院')||s.author.includes('医院');
        if(region==='factory') return s.hint?.includes('工厂')||s.author.includes('工厂')||s.author.includes('车间');
        return true;
    });
    if(pool.length===0) return STORIES[Math.floor(Math.random()*STORIES.length)];
    return pool[Math.floor(Math.random()*pool.length)];
}

export function getRandomStory(): StoryEntry {
    return STORIES[Math.floor(Math.random()*STORIES.length)];
}
