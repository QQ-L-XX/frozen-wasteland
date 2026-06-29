// 极寒末世 — 多结局系统

export interface EndingDef {
    id: string;
    title: string;
    subtitle: string;
    condition: (ctx: EndingContext) => boolean;
    story: string;
}

export interface EndingContext {
    day: number;
    survivorCount: number;
    survivorsAlive: number;
    hasRadio: boolean;
    hasBoiler: boolean;
    hasGreenhouse: boolean;
    radioSignalsReceived: number;
    totalFood: number;
    totalFuel: number;
}

export const ENDINGS: EndingDef[] = [
    {
        id: 'collapse', title: '❄ 全面崩溃', subtitle: '最后一人倒在了雪中',
        condition: (ctx) => ctx.survivorsAlive === 0,
        story: '炉火熄灭了。最后一个幸存者倒在了冰冷的地板上，手里还攥着一封未寄出的信。\n\n暴风雪继续肆虐，仿佛什么都没有发生过。基地的墙壁在风中吱嘎作响，慢慢被白色吞没。\n\n也许开春后，会有人路过这里。发现一个被雪埋了一半的避难所，和一些未曾讲完的故事。',
    },
    {
        id: 'survival', title: '🔥 艰难生存', subtitle: '熬过了最漫长的冬天',
        condition: (ctx) => ctx.day >= 50 && ctx.survivorsAlive > 0,
        story: '第 50 个日出。阳光穿透云层，照在基地的墙壁上。\n\n没有人说话。他们只是站着，看着那束光。老兵拍了拍技师肩膀，医生默默递过热茶。\n\n这不是胜利——春天还远。但他们知道，最难的那段路，已经走完了。',
    },
    {
        id: 'heating', title: '🏭 供暖网', subtitle: '人类用火焰驯服了极寒',
        condition: (ctx) => ctx.hasBoiler && ctx.hasGreenhouse && ctx.totalFuel >= 10000 && ctx.day >= 30,
        story: '锅炉的轰鸣声在管道中回荡。每一个房间都温暖如春。温室里，土豆的绿叶在灯光下舒展。\n\n有人提议给这个供暖网起个名字。争论了很久，最后决定叫它"火种"——因为从这里开始，火再也不会熄灭。',
    },
    {
        id: 'signal', title: '📡 信号回应', subtitle: '无线电里传来了人类的声音',
        condition: (ctx) => ctx.hasRadio && ctx.radioSignalsReceived >= 5 && ctx.day >= 25,
        story: '那天晚上，无线电里不再是白噪音。\n\n"这里是春城避难所。我们收到了你们的信号。重复——我们收到了。请保持频率。救援队正在路上。"\n\n医生哭了。老兵把头埋进双手里。技师开始核对坐标。\n\n他们不再孤单。',
    },
    {
        id: 'revival', title: '🌱 区域复兴', subtitle: '文明的种子重新发芽',
        condition: (ctx) => ctx.day >= 60 && ctx.survivorCount >= 5 && ctx.hasRadio && ctx.hasGreenhouse && ctx.totalFood >= 100,
        story: '越来越多的幸存者循着无线电信号找到了这里。基地不断扩建，已经看不出最初的模样。\n\n有人种下了第一棵苹果树——那是从废墟中找到的种子。\n\n也许要等很多年才能结果。但那不重要。重要的是有人在种树。',
    },
    {
        id: 'escape', title: '🏍 冰原逃亡', subtitle: '骑着摩托冲向南方',
        condition: (ctx) => ctx.day >= 20 && ctx.totalFuel >= 15000 && ctx.survivorsAlive >= 1,
        story: '油箱灌满了。摩托的引擎在寒风中轰鸣。\n\n没有人知道南方还有没有温暖的土地。但至少，他们不再困守在这片冻土上。\n\n后视镜里，基地的轮廓越来越小，最后消失在风雪中。',
    },
    {
        id: 'last_guardian', title: '🕯 最后的守望者', subtitle: '独自守护着火焰',
        condition: (ctx) => ctx.day >= 40 && ctx.survivorCount === 1 && ctx.survivorsAlive === 1,
        story: '其他人都不在了。但他还守着那堆火。\n\n每天晚上，他会在无线电前坐一会儿——不是为了求救，只是想让某个遥远频率上的人知道：这里还有一盏灯亮着。\n\n也许春天会来。也许不会。但他会等到最后一刻。',
    },
    {
        id: 'trade_empire', title: '🏛 冰雪商会', subtitle: '在废墟上建立了贸易网络',
        condition: (ctx) => ctx.day >= 35 && ctx.totalFood >= 200 && ctx.totalFuel >= 20000,
        story: '商队开始定期来访。他们用稀缺零件交换你多余的粮食。\n\n渐渐地，你的基地成了这片废土上最重要的贸易节点。有人叫你"冰原商人"，也有人叫你"救星"。\n\n文明不只需要幸存者——它需要交易、信任和一张重新编织的网络。',
    },
    {
        id: 'frost_farm', title: '🥬 冻土农场', subtitle: '在永冻层上种出了春天',
        condition: (ctx) => ctx.day >= 35 && ctx.hasGreenhouse && ctx.totalFood >= 100,
        story: '温室里的灯光24小时不灭。土豆、番茄、药草——每一片绿叶都是对极寒的蔑视。\n\n幸存者们轮流照看作物，像对待婴儿一样小心翼翼。\n\n有人开玩笑说："等春天真的来了，我们反而要不习惯了。"',
    },
    {
        id: 'first_year', title: '🌅 第一年', subtitle: '熬过了四季轮回',
        condition: (ctx) => ctx.day >= 480 && ctx.survivorsAlive > 0,
        story: '第 480 个日出。\n\n当春天的第一缕阳光穿透云层，所有人都走到了室外——不是因为需要做什么，而是想感受风不是刀割的日子。\n\n技师在墙上刻下了"1"。老兵说：明年刻个"2"。\n\n他们笑了。他们已经知道怎么活下去了。',
    },
    {
        id: 'settlement', title: '🏘 幸存者聚落', subtitle: '文明的种子重新发芽',
        condition: (ctx) => ctx.day >= 1440 && ctx.survivorCount >= 3 && ctx.hasRadio && ctx.hasGreenhouse,
        story: '三年了。基地周围已经长出了一些低矮的灌木——它们学会了在寒冷里生长。\n\n无线电网络联系的聚落越来越多。有人提议建立贸易路线，有人提议编写一本"末日生存手册"。\n\n文明的种子，正在这片冻土上重新扎根。',
    },
    {
        id: 'new_civilization', title: '🌟 新文明', subtitle: '冰雪中重建了人类家园',
        condition: (ctx) => ctx.day >= 2400 && ctx.survivorCount >= 5 && ctx.hasRadio,
        story: '五年。孩子们在温室里出生，在供暖管道旁学会走路。他们不知道春天应该是什么样子——对他们来说，这就是世界本来的样子。\n\n老兵已经老了，但他每天还是会擦一遍那把生锈的猎枪。"不是用来打仗的，"他说，"是用来提醒我们走了多远。"\n\n火种传下去了。',
    },
];

export class EndingManager {
    triggered: string|null = null;
    radioSignalCount = 0;

    checkEndings(ctx: EndingContext): EndingDef|null {
        if(this.triggered) return null;
        for(const ending of ENDINGS){
            if(ending.condition(ctx)){
                this.triggered = ending.id;
                return ending;
            }
        }
        return null;
    }
}