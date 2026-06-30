import { _decorator, Component } from 'cc';
import { GameManager } from './core/GameManager';
import { WorkType } from './core/SurvivorManager';
import { getRandomStory, StoryEntry, STORIES } from './data/Stories';
import { OutpostId } from './core/OutpostManager';
import { VersionManager } from './core/VersionManager';

const { ccclass } = _decorator;

const ITEM_INFO: Record<string,{name:string;desc:string}> = {
    food_can:{name:'罐头',desc:'基础食物'},
    food_bread:{name:'面包',desc:'基础食物'},
    food_veg:{name:'蔬菜',desc:'温室产出'},
    food_meat_frozen:{name:'冻肉',desc:'战斗掉落，高营养'},
    food_ration:{name:'军用干粮',desc:'高营养·保质期长'},
    food_soup:{name:'即食汤包',desc:'暖身·体温+5'},
    food_mushroom:{name:'干菌菇',desc:'轻便食物'},
    food_chocolate:{name:'巧克力',desc:'士气+2'},
    food_vitamin:{name:'维生素片',desc:'防疾病·士气+1'},
    fuel_wood:{name:'木材',desc:'燃料(100单位)+建材'},
    fuel_coal:{name:'煤炭',desc:'高效燃料(300单位)'},
    fuel_propane:{name:'丙烷罐',desc:'极高效燃料(800单位)·稀有'},
    mat_wood:{name:'木板',desc:'建材，造墙/地板/床/架子'},
    mat_metal:{name:'金属',desc:'建材，造煤炉/管道/工坊/载具'},
    mat_insulation:{name:'保温材',desc:'建材，造管道/床/雪橇'},
    mat_glass:{name:'玻璃',desc:'建材，造温室/窗户'},
    mat_soil:{name:'土壤',desc:'造温室用'},
    mat_foam:{name:'泡沫板',desc:'高级保温材料'},
    med_bandage:{name:'绷带',desc:'治疗轻伤'},
    med_antibiotic:{name:'抗生素',desc:'治疗感染'},
    med_frostbite:{name:'冻伤膏',desc:'治疗冻伤'},
    med_firstaid:{name:'急救包',desc:'重伤救命'},
    med_painkiller:{name:'止痛药',desc:'暂时忽略伤害惩罚'},
    med_stimulant:{name:'兴奋剂',desc:'2小时内无视疲劳'},
    med_herb:{name:'药草',desc:'温室产出·可制药'},
    part_battery:{name:'电池',desc:'零件，造高级设备'},
    part_wire:{name:'电线',desc:'零件，电路连接'},
    part_circuit:{name:'电路板',desc:'零件，造工坊/摩托'},
    part_motor:{name:'马达',desc:'造雪地摩托'},
    part_chip:{name:'芯片',desc:'高级电子零件·稀有'},
    part_bearing:{name:'精密轴承',desc:'精密机械零件·稀有'},
    weapon_crowbar:{name:'撬棍',desc:'武器·伤害+5'},
    weapon_pistol:{name:'手枪',desc:'武器·伤害+9'},
    weapon_shotgun:{name:'猎枪',desc:'武器·伤害+17'},
    weapon_rifle:{name:'步枪',desc:'武器·伤害+12'},
    story_note:{name:'笔记',desc:'剧情物品，揭示世界观'},
    story_diary:{name:'日记',desc:'剧情物品，幸存者故事'},
    blueprint_coal:{name:'煤炉蓝图',desc:'工坊解读后解锁煤炉建造'},
    blueprint_greenhouse:{name:'温室蓝图',desc:'工坊解读后解锁温室建造'},
    blueprint_boiler:{name:'锅炉蓝图',desc:'工坊解读后解锁锅炉建造（比煤炉强60%）'},
    blueprint_radio:{name:'无线电蓝图',desc:'工坊解读后解锁无线电室（被动监听+主动扫描）'},
};

@ccclass('GameManagerComp')
export class GameManagerComp extends Component {
    private game!: GameManager;
    private hudTimer=0;
    private cellSize=12; private mapSize=30;
    private tool='view';
    private rectStart: {x:number,y:number}|null = null;
    private rectPreview: {x:number,y:number}|null = null;
    private unlocked: Set<string> = new Set();

    // DOM elements
    private hudDom!: HTMLDivElement;
    private hudTitleDom!: HTMLDivElement;
    private hudBodyDom!: HTMLDivElement;
    private messageDom!: HTMLDivElement;
    private toolDom!: HTMLDivElement;
    private canvasDom!: HTMLCanvasElement;
    private ctx!: CanvasRenderingContext2D;
    private menuDom!: HTMLDivElement;
    private storageDom!: HTMLDivElement;
    private charDom!: HTMLDivElement;
    private popupDom!: HTMLDivElement;
    private pauseDom!: HTMLDivElement;
    private popupText!: HTMLDivElement;
    private popupBtnA!: HTMLButtonElement;
    private popupBtnB!: HTMLButtonElement;
    private scavOverlayDom!: HTMLDivElement;
    private barDom!: HTMLDivElement;
    private btnStorage!: HTMLButtonElement;

    private popupTimer=0;
    private _m10=false; private _m20=false; private _evtShown=false;
    private messageTimer=0; private lastMessage='';
    private scavRefreshTimer=0;
    private lastHudText = '';
    private menuOutsideClickHandler: ((ev: MouseEvent)=>void)|null = null;
    private menuOutsideClickSeq = 0;
    private scavReturnConfirm = false;
    private readonly uiOwnerId = `frozen-ui-${Date.now()}-${Math.floor(Math.random()*100000)}`;
    private readonly version = new VersionManager();

    showMsg(msg: string){ this.lastMessage = msg; this.messageTimer = 5; }

    start(){
        const oldComp = (window as any)._frozenGameManagerComp as GameManagerComp|undefined;
        if(oldComp && oldComp !== this){
            oldComp.forceCleanupDomArtifacts();
            oldComp.enabled = false;
        }
        (window as any)._frozenGameManagerComp = this;
        this.cleanupDomArtifacts();
        // 注入 UI 样式表
        this.injectStyles();

        // HUD
        this.hudDom = document.createElement('div');
        this.hudDom.className = 'frozen-hud notranslate';
        this.hudDom.id = 'frozen-hud';
        this.hudDom.setAttribute('translate', 'no');
        this.hudDom.dataset.owner = this.uiOwnerId;
        this.hudTitleDom = document.createElement('div');
        this.hudTitleDom.className = 'frozen-hud-title notranslate';
        this.hudTitleDom.setAttribute('translate', 'no');
        this.hudTitleDom.dataset.owner = this.uiOwnerId;
        this.hudTitleDom.textContent = '❄ 极寒末世（点击切换难度）';
        this.hudBodyDom = document.createElement('div');
        this.hudBodyDom.className = 'frozen-hud-body notranslate';
        this.hudBodyDom.setAttribute('translate', 'no');
        this.hudBodyDom.dataset.owner = this.uiOwnerId;
        this.hudDom.appendChild(this.hudTitleDom);
        this.hudDom.appendChild(this.hudBodyDom);
        document.body.appendChild(this.hudDom);

        this.messageDom = document.createElement('div');
        this.messageDom.className = 'frozen-message notranslate';
        this.messageDom.setAttribute('translate', 'no');
        document.body.appendChild(this.messageDom);

        this.toolDom = document.createElement('div');
        this.toolDom.className = 'frozen-tool';
        document.body.appendChild(this.toolDom);
        this.updateToolHint();

        // 弹出菜单
        this.menuDom = document.createElement('div');
        this.menuDom.className = 'frozen-menu';
        document.body.appendChild(this.menuDom);

        // 仓储面板（右侧）
        this.storageDom = document.createElement('div');
        this.storageDom.className = 'frozen-panel frozen-storage';
        document.body.appendChild(this.storageDom);

        // 人物面板（左侧）
        this.charDom = document.createElement('div');
        this.charDom.className = 'frozen-panel frozen-chars';
        document.body.appendChild(this.charDom);

        // 弹窗
        this.popupDom = document.createElement('div');
        this.popupDom.className = 'frozen-popup';
        this.popupText = document.createElement('div');
        this.popupText.style.marginBottom = '12px';
        this.popupDom.appendChild(this.popupText);
        const btnRow = document.createElement('div');
        btnRow.className = 'frozen-popup-btns';
        this.popupBtnA = document.createElement('button');
        this.popupBtnA.className = 'frozen-popup-btn-a';
        this.popupBtnB = document.createElement('button');
        this.popupBtnB.className = 'frozen-popup-btn-b';
        btnRow.appendChild(this.popupBtnA);
        btnRow.appendChild(this.popupBtnB);
        this.popupDom.appendChild(btnRow);
        document.body.appendChild(this.popupDom);

        // 暂停菜单
        this.pauseDom = document.createElement('div');
        this.pauseDom.className = 'frozen-panel';
        this.pauseDom.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:1500;display:none;flex-direction:column;gap:10px;padding:24px;min-width:220px;text-align:center;background:var(--f-panel);border:1px solid var(--f-border-lit);border-radius:12px';
        this.pauseDom.innerHTML = `
            <div style="color:var(--f-accent);font-size:22px;font-weight:bold;margin-bottom:8px">⏸ 暂停</div>
            <button class="frozen-bar-btn" onclick="window._pauseAction('save')">💾 保存游戏</button>
            <button class="frozen-bar-btn" onclick="window._pauseAction('load')">📂 读取存档</button>
            <button class="frozen-bar-btn" onclick="window._pauseAction('title')">🏠 返回标题</button>
            <button class="frozen-bar-btn" style="opacity:0.7" onclick="window._pauseAction('resume')">▶ 继续游戏</button>
        `;
        document.body.appendChild(this.pauseDom);
        (window as any)._pauseAction = (action: string) => this.onPauseAction(action);

        // 搜刮覆盖层
        this.scavOverlayDom = document.createElement('div');
        this.scavOverlayDom.className = 'frozen-scavenge';
        document.body.appendChild(this.scavOverlayDom);

        // 棋盘 Canvas
        const px = this.cellSize * this.mapSize;
        this.canvasDom = document.createElement('canvas');
        this.canvasDom.width = px; this.canvasDom.height = px;
        this.canvasDom.className = 'frozen-canvas';
        this.canvasDom.style.marginTop = `${-px/2}px`;
        this.canvasDom.style.marginLeft = `${-px/2}px`;
        this.canvasDom.addEventListener('click', (e) => this.onCanvasClick(e));
        this.canvasDom.addEventListener('contextmenu', (e) => { e.preventDefault(); this.tool='view'; this.updateToolHint(); });
        this.canvasDom.addEventListener('mousemove', (e) => this.onCanvasMove(e));
        document.body.appendChild(this.canvasDom);
        this.ctx = this.canvasDom.getContext('2d')!;

        const savedDiff = localStorage.getItem('frost_diff') as 'easy'|'normal'|'hard'||null;
        this.game = new GameManager(savedDiff||'normal');
        this.game.setUnlockedBlueprints(this.unlocked);
        this.game.time.isPaused = true;  // 先暂停，等标题画面选择
        (window as any).game = this.game;
        (window as any)._frostDebug = {
            kit: () => { const msg = this.game.grantQaKit(); this.showMsg(msg); this.updateStorage(); return msg; },
            days: (n:number) => { const msg = this.game.advanceDaysForQa(n); this.showMsg(msg); return msg; },
            roundtrip: () => { const msg = this.game.saveLoadRoundtripForQa({unlocked:[...this.unlocked]}); this.showMsg(msg); return msg; },
            p0: () => { const msg = this.game.runP0SmokeForQa({unlocked:[...this.unlocked]}); this.showMsg(msg); this.updateStorage(); this.showCompletionPanel(); return msg; },
            status: () => this.game.getCompletionStatus(),
        };
        (window as any)._frostQa = (action: string, arg?: number) => {
            let msg = '';
            if(action === 'kit') msg = this.game.grantQaKit();
            else if(action === 'days') msg = this.game.advanceDaysForQa(arg ?? 7);
            else if(action === 'roundtrip') msg = this.game.saveLoadRoundtripForQa({unlocked:[...this.unlocked]});
            else if(action === 'p0') msg = this.game.runP0SmokeForQa({unlocked:[...this.unlocked]});
            else msg = '未知 QA 指令';
            this.showMsg(msg);
            this.updateStorage();
            this.showCompletionPanel();
        };

        // 首次启动弹窗选难度
        if(!savedDiff){
            setTimeout(()=>{
                this.showDifficultyPicker();
            }, 500);
        }

        // 防止 Cocos WebGL 画布拦截自定义 UI 的鼠标事件
        const disableCocosPointer = () => {
            const canvas = document.getElementById('GameCanvas') as HTMLCanvasElement;
            if(canvas){
                canvas.style.pointerEvents = 'none';
                // 也禁用 Cocos 容器 div（如果存在）
                const parent = canvas.parentElement;
                if(parent && parent !== document.body) parent.style.pointerEvents = 'none';
                canvas.addEventListener('webglcontextlost', (e) => {
                    e.preventDefault();
                    console.warn('WebGL context lost prevented');
                }, false);
                return true;
            }
            return false;
        };
        if(!disableCocosPointer()){
            // 画布可能异步创建，延迟重试
            setTimeout(() => disableCocosPointer(), 1000);
            setTimeout(() => disableCocosPointer(), 3000);
        }

        // 快捷键提示
        const keyDom = document.createElement('div');
        keyDom.id = 'frozen-key-hint';
        keyDom.style.cssText = 'position:fixed;bottom:52px;left:50%;margin-left:-180px;z-index:998;color:var(--f-dim);font:10px monospace;text-align:center;width:360px;pointer-events:none';
        keyDom.textContent = '1查看 2墙 3地板 4管道 5矩形  H热力图  空格暂停  +/-调速  Esc退出';
        document.body.appendChild(keyDom);

        this.createButtons();
        this.showTitleScreen();
        document.addEventListener('keydown', (e) => this.onKey(e));
    }

    private injectStyles(){
        document.documentElement.lang = 'zh-CN';
        document.documentElement.setAttribute('translate', 'no');
        document.body.setAttribute('translate', 'no');
        let meta = document.querySelector('meta[name="google"][content="notranslate"]') as HTMLMetaElement|null;
        if(!meta){
            meta = document.createElement('meta');
            meta.name = 'google';
            meta.content = 'notranslate';
            document.head.appendChild(meta);
        }
        let style = document.getElementById('frozen-ui-styles') as HTMLStyleElement|null;
        if(!style){
            style = document.createElement('style');
            style.id = 'frozen-ui-styles';
            document.head.appendChild(style);
        }
        style.id = 'frozen-ui-styles';
        style.textContent = `
/* ═══════ 极寒末世 UI v2 ═══════ */
:root {
  --f-bg: #080f1a;
  --f-panel: rgba(8,16,28,0.94);
  --f-border: #1e3a5a;
  --f-border-lit: #2a5a8a;
  --f-accent: #48b8e8;
  --f-accent-glow: rgba(72,184,232,0.25);
  --f-text: #c0daf0;
  --f-dim: #6088a8;
  --f-warn: #f0a040;
  --f-danger: #e05050;
  --f-success: #50c878;
  --f-btn-bg: linear-gradient(180deg, #1e3450 0%, #152230 100%);
  --f-btn-hover: linear-gradient(180deg, #285080 0%, #1a3050 100%);
  --f-btn-accent: linear-gradient(180deg, #1e4a30 0%, #152a20 100%);
  --f-btn-danger: linear-gradient(180deg, #501e20 0%, #301518 100%);
  --font: 'Segoe UI', 'Microsoft YaHei', monospace;
}
body { background: var(--f-bg); margin: 0; overflow: hidden; }

/* 面板基类 */
.frozen-panel {
  position: fixed; z-index: 998;
  background: var(--f-panel);
  border: 1px solid var(--f-border);
  border-radius: 8px;
  color: var(--f-text);
  font: 11px var(--font);
  padding: 10px 12px;
  line-height: 1.4;
  backdrop-filter: blur(6px);
  box-shadow: 0 4px 20px rgba(0,0,0,0.5), 0 0 40px var(--f-accent-glow);
}

/* HUD */
.frozen-hud {
  position: fixed; top: 12px; left: 16px; z-index: 999;
  background: var(--f-panel);
  border: 1px solid var(--f-border-lit);
  border-radius: 10px;
  color: var(--f-text);
  font: 13px/1.5 var(--font);
  padding: 12px 16px;
  white-space: pre-line;
  overflow-wrap: anywhere;
  box-sizing: border-box;
  box-shadow: 0 2px 16px rgba(0,0,0,0.6), 0 0 30px var(--f-accent-glow);
  width: 520px;
  max-width: calc(100vw - 32px);
  height: 148px;
  font-variant-numeric: tabular-nums;
  contain: layout paint;
  overflow: hidden;
}
.frozen-hud:not([data-owner]) {
  display: none !important;
}
.frozen-hud::before {
  content: none !important;
  display: none !important;
}
.frozen-hud-title {
  display: block;
  color: var(--f-accent);
  font-size: 15px;
  font-weight: bold;
  letter-spacing: 2px;
  margin-bottom: 6px;
  border-bottom: 1px solid var(--f-border-lit);
  padding-bottom: 6px;
}
.frozen-hud-body { white-space: pre-line; }
.frozen-hud:hover { border-color: var(--f-accent); }
.frozen-message {
  position: fixed; left: 552px; top: 20px; z-index: 999;
  width: min(360px, calc(100vw - 572px));
  min-width: 220px;
  box-sizing: border-box;
  pointer-events: none;
  display: none;
  color: var(--f-warn);
  background: rgba(8,14,24,0.9);
  border: 1px solid var(--f-border-lit);
  border-radius: 8px;
  padding: 8px 12px;
  font: 12px/1.45 var(--font);
  box-shadow: 0 2px 14px rgba(0,0,0,0.45), 0 0 18px var(--f-accent-glow);
  overflow-wrap: anywhere;
}
@media (max-width: 980px) {
  .frozen-message {
    left: 16px; top: 168px;
    width: min(520px, calc(100vw - 32px));
  }
}

/* 工具提示 */
.frozen-tool {
  position: fixed; bottom: 55px; left: 50%; margin-left: -150px;
  z-index: 999; width: 300px; text-align: center;
  color: var(--f-warn); font: 13px var(--font);
  background: rgba(8,14,24,0.85); padding: 6px 12px;
  border-radius: 20px; border: 1px solid var(--f-border-lit);
  box-shadow: 0 0 12px var(--f-accent-glow);
}

/* 按钮栏 */
.frozen-bar {
  position: fixed; bottom: 14px; left: 50%; margin-left: -240px;
  z-index: 999; display: flex; gap: 10px;
}
.frozen-bar-btn {
  background: var(--f-btn-bg);
  color: var(--f-text);
  border: 1px solid var(--f-border-lit);
  padding: 8px 16px; border-radius: 8px;
  cursor: pointer; font: bold 13px var(--font);
  transition: all 0.15s;
  box-shadow: 0 2px 8px rgba(0,0,0,0.4);
}
.frozen-bar-btn:hover {
  background: var(--f-btn-hover);
  border-color: var(--f-accent);
  box-shadow: 0 0 16px var(--f-accent-glow);
  color: #fff;
  transform: translateY(-1px);
}
.frozen-bar-btn:active { transform: translateY(0); }
.frozen-bar-btn.storage-open {
  background: var(--f-btn-accent);
  border-color: var(--f-success);
  box-shadow: 0 0 12px rgba(80,200,120,0.3);
}

/* 菜单 */
.frozen-menu {
  position: fixed; bottom: 95px; left: 50%; margin-left: -200px;
  z-index: 1000; display: none; flex-wrap: wrap; gap: 6px;
  justify-content: center; width: 400px;
  background: var(--f-panel);
  border: 1px solid var(--f-border-lit);
  border-radius: 12px; padding: 14px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.6), 0 0 40px var(--f-accent-glow);
}
.frozen-menu-btn {
  background: var(--f-btn-bg);
  color: var(--f-text);
  border: 1px solid var(--f-border);
  padding: 6px 12px; border-radius: 6px;
  cursor: pointer; font: 12px var(--font);
  transition: all 0.12s;
}
.frozen-menu-btn:hover {
  background: var(--f-btn-hover);
  border-color: var(--f-accent);
  box-shadow: 0 0 10px var(--f-accent-glow);
  color: #fff;
}

/* 弹窗 */
.frozen-popup {
  position: fixed; top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  z-index: 2000; display: none;
  background: var(--f-panel);
  border: 2px solid var(--f-accent);
  border-radius: 14px;
  color: var(--f-text); font: 13px var(--font);
  padding: 20px 24px; width: 340px; max-height: 85vh; overflow-y: auto;
  text-align: center; white-space: pre-line; line-height: 1.5;
  box-shadow: 0 8px 40px rgba(0,0,0,0.7), 0 0 60px var(--f-accent-glow);
  animation: frozenFadeIn 0.2s ease-out;
}
@keyframes frozenFadeIn {
  from { opacity: 0; transform: translate(-50%, -50%) scale(0.95); }
  to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
}
.frozen-popup-btns { display: flex; gap: 12px; justify-content: center; margin-top: 8px; }
.frozen-popup-btn-a {
  background: var(--f-btn-accent);
  color: #fff; border: 1px solid var(--f-success);
  padding: 8px 28px; border-radius: 8px;
  cursor: pointer; font: bold 13px var(--font);
  display: none; transition: all 0.15s;
}
.frozen-popup-btn-a:hover { box-shadow: 0 0 16px rgba(80,200,120,0.4); transform: translateY(-1px); }
.frozen-popup-btn-b {
  background: var(--f-btn-danger);
  color: #fff; border: 1px solid var(--f-danger);
  padding: 8px 28px; border-radius: 8px;
  cursor: pointer; font: bold 13px var(--font);
  display: none; transition: all 0.15s;
}
.frozen-popup-btn-b:hover { box-shadow: 0 0 16px rgba(224,80,80,0.4); transform: translateY(-1px); }

/* 搜刮覆盖 */
.frozen-scavenge {
  position: fixed; top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  z-index: 2000; visibility: hidden;
  background: var(--f-panel);
  border: 2px solid var(--f-border-lit);
  border-radius: 14px;
  color: var(--f-text); font: 12px var(--font);
  padding: 10px 14px; width: 680px; max-height: 94vh; overflow-y: auto;
  box-shadow: 0 8px 40px rgba(0,0,0,0.6);
  animation: scavFadeIn 0.15s ease-out;
}
@keyframes scavFadeIn {
  from { opacity: 0; transform: translate(-50%, -50%) scale(0.95); }
  to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
}

/* 仓储/人物 */
.frozen-storage { top: 55px; right: 14px; min-width: 150px; max-height: 420px; overflow-y: auto; white-space: pre-line; }
.frozen-chars { top: 176px; left: 16px; min-width: 195px; }

/* Canvas */
.frozen-canvas {
  position: fixed; top: 50%; left: 50%;
  z-index: 10;
  border: 2px solid var(--f-border-lit);
  border-radius: 12px;
  cursor: crosshair;
  box-shadow: 0 0 40px var(--f-accent-glow), 0 4px 24px rgba(0,0,0,0.5);
}
`; 
    }

    private cleanupDomArtifacts(){
        const selector = [
            '.frozen-hud', '.frozen-tool', '.frozen-menu', '.frozen-storage', '.frozen-chars',
            '.frozen-popup', '.frozen-scavenge', '.frozen-canvas', '.frozen-bar', '.frozen-message', '#frozen-key-hint',
            '#frozen-ui-styles',
        ].join(',');
        document.querySelectorAll(selector).forEach(el=>el.parentNode?.removeChild(el));
    }

    private enforceSingleHud(){
        document.querySelectorAll('.frozen-hud').forEach(el=>{
            if(el !== this.hudDom) el.parentNode?.removeChild(el);
        });
        if(!this.hudDom.parentNode) document.body.appendChild(this.hudDom);
        if(!this.hudTitleDom.parentNode || this.hudTitleDom.parentNode !== this.hudDom){
            this.hudDom.insertBefore(this.hudTitleDom, this.hudDom.firstChild);
        }
        if(!this.hudBodyDom.parentNode || this.hudBodyDom.parentNode !== this.hudDom){
            this.hudDom.appendChild(this.hudBodyDom);
        }
        this.hudDom.id = 'frozen-hud';
        this.hudDom.className = 'frozen-hud notranslate';
        this.hudDom.setAttribute('translate', 'no');
        this.hudDom.dataset.owner = this.uiOwnerId;
        this.hudTitleDom.className = 'frozen-hud-title notranslate';
        this.hudTitleDom.setAttribute('translate', 'no');
        this.hudBodyDom.className = 'frozen-hud-body notranslate';
        this.hudBodyDom.setAttribute('translate', 'no');
        this.hudTitleDom.textContent = '❄ 极寒末世（点击切换难度）';
    }

    forceCleanupDomArtifacts(){
        this.cleanupDomArtifacts();
        if(this.menuOutsideClickHandler){
            document.removeEventListener('click', this.menuOutsideClickHandler);
            this.menuOutsideClickHandler = null;
        }
    }

    private bindMenuOutsideClose(delay = 120){
        const seq = ++this.menuOutsideClickSeq;
        if(this.menuOutsideClickHandler){
            document.removeEventListener('click', this.menuOutsideClickHandler);
            this.menuOutsideClickHandler = null;
        }
        setTimeout(()=>{
            if(seq !== this.menuOutsideClickSeq) return;
            this.menuOutsideClickHandler = (ev: MouseEvent) => {
                if(this.menuDom.style.display !== 'flex') return;
                if(!this.menuDom.contains(ev.target as Node)) this.closeMenu();
            };
            document.addEventListener('click', this.menuOutsideClickHandler);
        }, delay);
    }

    private createButtons(){
        this.barDom = document.createElement('div');
        this.barDom.className = 'frozen-bar';
        const btns: [string,()=>void][] = [
            ['🔨 建造', ()=>this.showMenu('build')],
            ['📦 搜刮', ()=>this.showMenu('scavenge')],
            ['🏠 基地', ()=>this.showMenu('base')],
            ['📦 仓库', ()=>this.toggleStorage()],
            ['⚙️ 系统', ()=>this.showMenu('system')],
        ];
        btns.forEach(([label,fn])=>{
            const btn = document.createElement('button');
            btn.textContent = label;
            btn.className = 'frozen-bar-btn';
            btn.addEventListener('click', (e) => { e.stopPropagation(); fn(); });
            this.barDom.appendChild(btn);
        });
        this.btnStorage = this.barDom.children[3] as HTMLButtonElement;
        document.body.appendChild(this.barDom);
    }

    // ============================== 菜单系统 ==============================
    private showMenu(type: string){
        if(this.menuDom.style.display === 'flex'){
            this.menuDom.style.display = 'none';
            if(this.menuDom.dataset.type === type) return;
        }
        this.menuDom.innerHTML = '';
        this.menuDom.style.display = 'flex';
        this.menuDom.style.width = '';
        this.menuDom.style.marginLeft = '';
        this.menuDom.dataset.type = type;

        const mkBtn = (text:string, fn:()=>void, _color?:string, tip?:string) => {
            const btn = document.createElement('button');
            btn.innerHTML = text;
            btn.className = 'frozen-menu-btn';
            btn.addEventListener('click', (e)=>{ e.stopPropagation(); fn(); });
            if(tip){
                btn.style.position = 'relative';
                const tipDiv = document.createElement('div');
                tipDiv.textContent = tip;
                tipDiv.style.cssText = 'display:none;position:absolute;bottom:110%;left:50%;transform:translateX(-50%);'+
                    'background:rgba(8,16,28,0.97);color:#c0daf0;font:11px monospace;padding:6px 10px;'+
                    'border-radius:6px;border:1px solid #2a5a8a;white-space:pre-line;'+
                    'z-index:9999;pointer-events:none;min-width:100px;text-align:left;';
                btn.addEventListener('mouseenter', ()=>{ tipDiv.style.display='block'; });
                btn.addEventListener('mouseleave', ()=>{ tipDiv.style.display='none'; });
                btn.appendChild(tipDiv);
            }
            return btn;
        };

        const matCount = (needs:Record<string,number>):string => {
            let s = '';
            for(const [id,n] of Object.entries(needs)) s += ` ${Math.round(this.game.inventory.get(id))}/${n}`;
            return s;
        };
        const matTip = (desc:string, needs:Record<string,number>):string => {
            let tip = desc;
            for(const [id,need] of Object.entries(needs)){
                const have = Math.round(this.game.inventory.get(id));
                const ok = have >= need;
                tip += `\n${ok?'✅':'❌'} ${this.itemName(id)} ${have}/${need}`;
            }
            return tip;
        };

        if(type==='build'){
            const items: [string,()=>void,string?,string?][] = [
                ['🧱墙', ()=>{ this.tool='wall'; this.updateToolHint(); this.closeMenu(); }, undefined, matTip('点击格子 · 保温40%',{mat_wood:3})],
                ['🪵地板', ()=>{ this.tool='floor'; this.updateToolHint(); this.closeMenu(); }, undefined, matTip('点击格子 · 温度传导',{mat_wood:1})],
                ['🔧管道', ()=>{ this.tool='pipe'; this.updateToolHint(); this.closeMenu(); }, undefined, matTip('点击格子 · 传热',{mat_metal:1,mat_insulation:1})],
                ['📐矩形', ()=>{ this.tool='rect'; this.updateToolHint(); this.closeMenu(); }, undefined, matTip('拖拽两点围墙',{mat_wood:3})],
                ['🚪木门', ()=>{ this.tool='door'; this.updateToolHint(); this.closeMenu(); }, undefined, matTip('点墙换门 · 保温30%',{mat_wood:5,mat_metal:2})],
                ['🧱加固', ()=>{ this.tool='rwall'; this.updateToolHint(); this.closeMenu(); }, undefined, matTip('点墙加固 · 保温70%',{mat_wood:5,mat_metal:2})],
            ];
            // 科技锁建筑：仅已解锁时显示
            const techCheck = (id:string,label:string,tool:string,clr:string,cost:Record<string,number>)=>{
                if(this.unlocked.has(id)){
                    items.push([label,()=>{this.tool=tool;this.updateToolHint();this.closeMenu();},clr,matTip('点击空地建造',cost)]);
                }
            };
            techCheck('blueprint_coal','🔥煤炉','coalstove','#4a3',{mat_metal:5});
            techCheck('blueprint_boiler','🏭锅炉','boiler','#f84',{mat_metal:8,mat_insulation:5});
            items.push(['🛏床',()=>{ this.tool='bed'; this.updateToolHint(); this.closeMenu(); }, undefined, matTip('点击空地建造',{mat_insulation:3})]);
            items.push(['🔬工坊',()=>{ this.tool='workshop'; this.updateToolHint(); this.closeMenu(); }, undefined, matTip('点击空地建造',{mat_metal:10,part_circuit:3})]);
            items.push(['🪔油灯',()=>{ this.tool='lantern'; this.updateToolHint(); this.closeMenu(); }, undefined, matTip('点击空地建造',{mat_metal:3})]);
            techCheck('blueprint_greenhouse','🌱温室','greenhouse','#4a3',{mat_wood:10,mat_glass:5,mat_soil:3});
            techCheck('blueprint_radio','📡无线电','radio','#48e',{mat_metal:10,part_circuit:5});
            items.push(['🪟窗户',()=>{ this.tool='window'; this.updateToolHint(); this.closeMenu(); },'#48a',matTip('点墙开窗 · 士气+1~3/天',{mat_glass:2,mat_wood:2})]);
            items.push(['🏥医疗',()=>{ this.tool='medical'; this.updateToolHint(); this.closeMenu(); },'#e6a',matTip('点击空地建造',{mat_metal:5,mat_insulation:3})]);
            items.push(['🍳厨房',()=>{ this.tool='kitchen'; this.updateToolHint(); this.closeMenu(); },'#fa4',matTip('点击空地建造',{mat_metal:3,mat_wood:2})]);
            items.push(['🪤陷阱',()=>{ this.tool='trap'; this.updateToolHint(); this.closeMenu(); },'#a44',matTip('点击空地建造',{mat_metal:3,mat_wood:4})]);
            items.push(['🪦埋葬',()=>{ this.tool='bury'; this.updateToolHint(); this.closeMenu(); },'#864',matTip('点击尸体移除·士气+5/人',{mat_wood:2})]);
            // T4 高级建筑
            items.push(['🏗地下墙',()=>{ this.tool='uwall'; this.updateToolHint(); this.closeMenu(); },'#8af',matTip('极高保温90% · 点击空地',{mat_metal:4,mat_insulation:5})]);
            items.push(['🌋地热井',()=>{
                if(!this.game.build.hasBoiler()){ this.showMsg('需先建造锅炉'); return; }
                this.tool='geothermal'; this.updateToolHint(); this.closeMenu();
            },'#f44',matTip('T4免费供暖 · 无需燃料',{mat_metal:20,part_circuit:8})]);
            items.push(['🔫炮塔',()=>{
                if(!this.game.build.hasWorkshop()){ this.showMsg('需先建造工坊'); return; }
                this.tool='turret'; this.updateToolHint(); this.closeMenu();
            },'#f84',matTip('每日自动攻击 · 伤害15',{mat_metal:12,part_circuit:4})]);
            items.forEach(([t,f,c,d]) => this.menuDom.appendChild(mkBtn(t,f,c,d)));
        }else if(type==='scavenge'){
            this.showWorldMap(mkBtn);
            return;
        }else if(type==='base'){
            const g = this.game;
            const items: [string,()=>void,string?,string?][] = [
                ['🛷雪橇',()=>{ g.buildVehicle('sled'); this.showMsg(g.vehicle.current?'雪橇已建造':'材料不足'); this.closeMenu(); }, undefined, matTip('解锁商业街/荒野/仓储',{mat_wood:8,mat_metal:4,mat_insulation:3})],
                ['🏍摩托',()=>{ g.buildVehicle('snowmobile'); this.showMsg(g.vehicle.current==='snowmobile'?'摩托已建造':'材料不足'); this.closeMenu(); }, undefined, matTip('解锁全区域·省燃料50%',{mat_metal:15,part_circuit:5,part_motor:1})],
                ['🔧升级',()=>{ this.showUpgradeMenu(); }, undefined, '升级当前载具（储物/加热）'],
                ['🌾种植',()=>{ const e=g.greenhouse.plant(g.baseGrid); this.showMsg(e||'已种植'); this.closeMenu(); }, undefined, '温室需≥+2°C·5天后收蔬菜×15'],
                ['📡扫描',()=>{
                    const result = g.scanRadio();
                    this.showMsg(result||'扫描失败');
                    this.closeMenu();
                },'#48e', '消耗电路板×1·主动扫描无线电信号'],
                ['🔬科技树',()=>{ this.showTechTree(); },'#a8e', '查看所有科技解锁状态'],
                ['📜长线',()=>{ this.showLongTermPanel(); },'#6ae', '查看聚落等级与长期目标'],
                ['🗺世界',()=>{ this.showWorldPanel(); },'#4ad', '建设外部哨站与生产网络'],
                ['✅完成度',()=>{ this.showCompletionPanel(); },'#4c8', '查看 v1.0 收束清单与测试助手'],
                ['🔬解读蓝图',()=>{
                    const bps = g.findBlueprints();
                    if(bps.length===0){ this.showMsg('无蓝图'); this.closeMenu(); return; }
                    if(!g.build.hasWorkshop()){ this.showMsg('需先建工坊'); this.closeMenu(); return; }
                    if(bps.length===1){
                        const r = g.interpretBlueprint(bps[0]);
                        if(r && r.startsWith('blueprint_')){ this.unlocked.add(r); this.showMsg(`🔓 ${this.itemName(r)} 已解读`); }
                        else this.showMsg(r||'解读失败');
                        this.closeMenu();
                    } else {
                        this.showBlueprintChoiceMenu(bps);
                    }
                },'#a84'],
            ];
            items.forEach(([t,f,c,d]) => this.menuDom.appendChild(mkBtn(t,f,c,d)));
        }else if(type==='system'){
            const cur = this.game.difficulty;
            const diffs: Array<{label:string, id:string}> = [
                {label:'🟢 简单', id:'easy'}, {label:'🟡 普通', id:'normal'}, {label:'🔴 困难', id:'hard'},
                {label:'💀 噩梦', id:'nightmare'}, {label:'☠️ 启示录', id:'apocalypse'},
            ];
            const items: [string,()=>void,string?][] = [
                ['💾 存档', ()=>{ this.onPauseAction('save'); this.closeMenu(); }],
                ['📂 读档', ()=>{ this.onPauseAction('load'); this.closeMenu(); }],
                ['🏠 返回标题', ()=>{ this.onPauseAction('title'); this.closeMenu(); }],
                ['📋 版本', ()=>{ this.showVersionPanel(); }],
            ];
            for(const d of diffs){
                items.push([`${d.label}${cur===d.id?' ✓':''}`, ()=>{ this.onPauseAction('setDiff'); this.game.difficulty = d.id as any; this.game.combat.diffMult = this.game.diffMult(); localStorage.setItem('frost_diff', d.id); this.closeMenu(); this.showMsg(`难度: ${d.label}`); }]);
            }
            items.forEach(([t,f,c]) => this.menuDom.appendChild(mkBtn(t,f,c)));
        }

        this.bindMenuOutsideClose();
    }

    private showWorldMap(_mkBtn: any){
        const g = this.game;
        const grid: (string|null)[][] = [
            [null,'wilderness',null,null,'research'],
            [null,'commercial','storage',null,'military'],
            ['suburb',null,'hospital','factory',null],
        ];
        const info: Record<string,{icon:string;name:string;risk:number}> = {
            suburb:{icon:'🏘️',name:'郊区',risk:1},wilderness:{icon:'🌲',name:'荒野',risk:2},
            commercial:{icon:'🏪',name:'商业街',risk:2},storage:{icon:'📦',name:'仓储区',risk:3},
            hospital:{icon:'🏥',name:'医院',risk:3},factory:{icon:'🏭',name:'工厂',risk:4},
            research:{icon:'🔬',name:'研究所',risk:4},military:{icon:'🎖️',name:'军事基地',risk:5},
        };
        let h='<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px;width:100%;max-width:450px;margin:0 auto">';
        for(const row of grid) for(const id of row){
            if(!id){ h+='<div></div>'; continue; }
            const n=info[id];
            const locked=!g.vehicle.hasUnlock(id);
            const dep=g.scavenge.getDepletion(id);
            const hp=Math.max(0,100-dep);
            const rc=n.risk<=2?'#4a4':n.risk<=3?'#aa4':n.risk<=4?'#a44':'#a04';
            h+=`<div style="background:${locked?'rgba(20,30,50,0.5)':'rgba(20,40,60,0.85)'};border:1px solid ${locked?'#333':rc};border-radius:8px;text-align:center;padding:5px 3px;cursor:${locked?'default':'pointer'};transition:all 0.15s;min-height:62px"`+
                (locked?'':`onclick="event.stopPropagation();window._wmGo('${id}')"`)+
                ` onmouseenter="this.style.borderColor='var(--f-accent)';this.style.boxShadow='0 0 10px var(--f-accent-glow)'" onmouseleave="this.style.borderColor='${locked?'#333':rc}';this.style.boxShadow='none'">`+
                `<div style="font-size:22px">${locked?'🔒':n.icon}</div><div style="color:${locked?'#555':'var(--f-text)'};font-size:12px;font-weight:bold">${n.name}</div>`+
                `<div style="color:${rc};font-size:10px">⚠${n.risk}</div><div style="background:rgba(0,0,0,0.4);height:4px;border-radius:2px;margin-top:3px"><div style="width:${hp}%;height:100%;background:${hp>60?'#4a4':hp>30?'#aa4':'#a44'};border-radius:2px"></div></div></div>`;
        }
        h+='</div>';
        (window as any)._wmGo=(id:string)=>{const e=g.scavengeCmd(id);if(e){this.showMsg(e);return;}this.closeMenu();this.showScavModeMenu();};
        this.menuDom.innerHTML=h;
        this.menuDom.style.width='460px';
        this.menuDom.style.marginLeft='-230px';
        this.bindMenuOutsideClose();
    }

    private closeMenu(){
        this.menuDom.style.display = 'none';
        this.menuOutsideClickSeq++;
        if(this.menuOutsideClickHandler){
            document.removeEventListener('click', this.menuOutsideClickHandler);
            this.menuOutsideClickHandler = null;
        }
    }

    private closeTransientUi(){
        this.closeMenu();
        if(this.storageDom) this.storageDom.style.display = 'none';
        if(this.btnStorage) this.btnStorage.classList.remove('storage-open');
        if(this.charDom) this.charDom.style.display = 'none';
        if(this.pauseDom) this.pauseDom.style.display = 'none';
        if(this.popupDom) this.popupDom.style.display = 'none';
        if(this.scavOverlayDom) this.scavOverlayDom.style.display = 'none';
        this.popupTimer = 0;
        this._evtShown = false;
        this.scavReturnConfirm = false;
        this.tool = 'view';
        this.updateToolHint();
    }

    // ============================== 仓储 ==============================
    private toggleStorage(){
        const open = this.storageDom.style.display !== 'block';
        this.storageDom.style.display = open ? 'block' : 'none';
        if(open){ this.updateStorage(); this.btnStorage.classList.add('storage-open'); }
        else this.btnStorage.classList.remove('storage-open');
    }
    private updateStorage(){
        const inv = this.game.inventory;
        const cats: Record<string,{id:string;qty:number;fresh?:number}[]> = {};
        inv.forEach((id,qty)=>{
            if(qty<=0) return;
            let cat = '📦其他';
            if(id.startsWith('food_')) cat='🍖食物';
            else if(id.startsWith('fuel_')) cat='⛽燃料';
            else if(id.startsWith('mat_')) cat='🪵建材';
            else if(id.startsWith('med_')) cat='💊药品';
            else if(id.startsWith('part_')) cat='🔌零件';
            else if(id.startsWith('blueprint_')) cat='📘蓝图';
            if(!cats[cat]) cats[cat]=[];
            const fresh = id.startsWith('food_') ? inv.getFreshness(id) : undefined;
            cats[cat].push({id,qty,fresh});
        });
        const foodIds = ['food_can','food_bread','food_ration','food_soup','food_mushroom','food_meat_frozen','food_veg','food_chocolate','food_vitamin'];
        let html = '';
        for(const[cat,items] of Object.entries(cats)){
            html += `<div style="color:#fc4;font-size:11px;margin-top:4px">${cat}</div>`;
            html += '<div style="font-size:10px;line-height:1.3">';
            html += items.map(i=>{
                let txt = `${this.itemName(i.id)}×${Math.round(i.qty)}`;
                if(i.fresh !== undefined){
                    const fc = i.fresh >= 70 ? '#4f8' : i.fresh >= 40 ? '#fa4' : '#f44';
                    txt += ` <span style="color:${fc};font-size:9px">${Math.round(i.fresh)}%</span>`;
                }
                return txt;
            }).join(' ');
            html += '</div>';
        }
        if(!html) html = '<span style="color:#888">仓库是空的</span>';
        this.storageDom.innerHTML = html;
    }

    // ============================== 人物面板 ==============================
    private updateCharPanel(){
        const wNames: Record<string,string> = {build:'🔨建造',heal:'💊医疗',farm:'🌾种植',guard:'🛡守卫',rest:'😴休息',hunt:'🏹狩猎',radio:'📡无线电'};
        const wEffects: Record<string,string> = {build:'建蓝图',heal:'自回+2·治+8',farm:'温室加速·恢复',guard:'全员减伤30%',rest:'疲劳-8·士气+2',hunt:'概率获冻肉+毛皮·5%受伤',radio:'士气+1·概率获零件'};
        const works = ['build','heal','farm','guard','rest','hunt','radio'];

        // 注册全局 handler
        (window as any)._setWork = (id: number, work: string) => {
            const s = this.game.survivors.survivors.find(sv=>sv.id===id);
            if(s){ s.work = work as any; this.showMsg(`${s.name} → ${wNames[work]}`); this.updateCharPanel(); }
        };

        let html = '<div style="color:var(--f-accent);font-weight:bold;font-size:13px;margin-bottom:6px;border-bottom:1px solid var(--f-border-lit);padding-bottom:4px">👥 幸存者工作</div>';

        for(const s of this.game.survivors.survivors){
            const hpColor = s.health>50?'var(--f-success)':s.health>20?'var(--f-warn)':'var(--f-danger)';
            html += `<div style="margin-bottom:4px;padding:4px 0;border-bottom:1px solid var(--f-border)">`;
            html += `<div style="color:${hpColor};font-weight:bold;margin-bottom:3px">${s.name} ❤${Math.round(s.health)} 😊${Math.round(s.morale)}%</div>`;
            // 关系显示
            const best = this.game.survivors.getBestRelation(s.id);
            const worst = this.game.survivors.getWorstRelation(s.id);
            if(best && best.val>20) html += `<div style="color:var(--f-success);font-size:10px;margin-bottom:2px">🤝 ${best.name} ${best.val>60?'❤️':best.val>40?'😊':'👍'}</div>`;
            if(worst && worst.val<-20) html += `<div style="color:var(--f-danger);font-size:10px;margin-bottom:2px">⚡ ${worst.name} ${worst.val<-60?'💢':worst.val<-40?'😠':'👎'}</div>`;

            html += '<div style="display:flex;flex-wrap:wrap;gap:3px">';
            for(const w of works){
                const active = s.work === w;
                html += `<span onclick="window._setWork(${s.id},'${w}')" style="
                    display:inline-block;cursor:pointer;font-size:11px;padding:2px 6px;border-radius:4px;
                    background:${active?'var(--f-accent-glow)':'rgba(20,40,60,0.6)'};
                    border:1px solid ${active?'var(--f-accent)':'var(--f-border)'};
                    color:${active?'#fff':'var(--f-dim)'};
                    transition:all 0.1s;
                " title="${wEffects[w]}">${wNames[w]}</span>`;
            }
            html += '</div>';
            // 效率显示
            const mm = this.game.survivors.getMoraleMult(s);
            const tm = this.game.survivors.getTraitWorkMult(s);
            const eff = Math.round(mm*tm*100);
            const effColor = eff>=120?'var(--f-success)':eff>=90?'var(--f-text)':eff>=70?'var(--f-warn)':'var(--f-danger)';
            html += `<div style="color:var(--f-dim);font-size:10px;margin-top:2px">${wEffects[s.work]} · <span style="color:${effColor}">效率${eff}%</span></div>`;
            html += '</div>';
        }
        this.charDom.innerHTML = html;
    }

    // ============================== 故事阅读弹窗 ==============================
    private showStoryPopup(story: StoryEntry){
        this._evtShown = true;
        const typeIcon = story.type==='diary'?'📖':story.type==='log'?'🎙️':'📝';
        const typeName = story.type==='diary'?'日记':story.type==='log'?'录音':'便条';
        this.popupText.innerHTML = `<div style="color:var(--f-accent);font-size:18px;font-weight:bold;margin-bottom:4px">${typeIcon} ${story.title}</div>`+
            `<div style="color:var(--f-dim);font-size:11px;margin-bottom:10px">${typeName} · ${story.author}</div>`+
            `<div style="color:var(--f-text);font-size:13px;line-height:1.7;text-align:left;white-space:pre-wrap;max-height:300px;overflow-y:auto;padding:12px;background:rgba(0,0,0,0.3);border-radius:8px;margin-bottom:10px">${story.text}</div>`+
            (story.hint?`<div style="color:var(--f-warn);font-size:11px;margin-bottom:8px">💡 ${story.hint}</div>`:'');
        this.popupBtnA.style.display = 'inline-block';
        this.popupBtnA.textContent = '📋 关闭';
        this.popupBtnA.onclick = () => { this._evtShown = false; this.popupDom.style.display = 'none'; };
        this.popupBtnB.style.display = 'none';
        this.popupDom.style.display = 'block';
        this.popupTimer = 0;
    }

    // ============================== 弹窗 ==============================
    private showPopup(title: string, body: string){
        this.popupText.innerHTML = `<div style="color:var(--f-accent);font-size:16px;font-weight:bold;margin-bottom:6px">${title}</div><div style="color:var(--f-text)">${body}</div>`;
        this.popupBtnA.style.display = 'none';
        this.popupBtnB.style.display = 'none';
        this.popupDom.style.display = 'block';
        this.popupTimer = 4;
    }

    private showChoicePopup(title: string, body: string, aLabel: string, bLabel: string, onA: ()=>void, onB: ()=>void){
        this._evtShown = true;
        this.popupText.innerHTML = `<div style="color:var(--f-accent);font-size:16px;font-weight:bold;margin-bottom:6px">${title}</div><div style="color:var(--f-text)">${body}</div>`;
        this.popupBtnA.style.display = 'inline-block';
        this.popupBtnA.textContent = aLabel;
        this.popupBtnA.onclick = () => { onA(); this._evtShown = false; this.popupDom.style.display = 'none'; };
        this.popupBtnB.style.display = 'inline-block';
        this.popupBtnB.textContent = bLabel;
        this.popupBtnB.onclick = () => { onB(); this._evtShown = false; this.popupDom.style.display = 'none'; };
        this.popupDom.style.display = 'block';
        this.popupTimer = 0;
    }

    // ============================== 搜刮模式选择 ==============================
    private showScavModeMenu(){
        this.menuDom.innerHTML = '';
        this.menuDom.style.display = 'flex';
        this.menuDom.dataset.type = 'scavmode';

        const mkBtn = (text:string, fn:()=>void, tip?:string) => {
            const btn = document.createElement('button');
            btn.innerHTML = text;
            btn.className = 'frozen-menu-btn';
            btn.addEventListener('click', (e)=>{ e.stopPropagation(); fn(); });
            if(tip){ btn.style.position='relative'; const d=document.createElement('div'); d.textContent=tip; d.style.cssText='display:none;position:absolute;bottom:110%;left:50%;transform:translateX(-50%);background:rgba(8,16,28,0.97);color:#c0daf0;font:11px monospace;padding:6px 10px;border-radius:6px;border:1px solid #2a5a8a;white-space:pre-line;z-index:9999;pointer-events:none;min-width:100px;text-align:left;'; btn.addEventListener('mouseenter',()=>{d.style.display='block';}); btn.addEventListener('mouseleave',()=>{d.style.display='none';}); btn.appendChild(d); }
            return btn;
        };

        const g=this.game;
        const s=g.scavenge;
        const hasTools = g.inventory.get('tool_crowbar')>0 || g.inventory.has('tool_lockpick',1);
        const toolTip = hasTools ? '\n🔧 拥有工具：额外+1物品' : '';

        this.menuDom.appendChild(mkBtn('🔍 选择搜刮方式',()=>{}));
        this.menuDom.appendChild(mkBtn('🦶 静步潜入',()=>{
            s.noise=0; s.duration=Math.floor(s.duration*1.5);
            (s as any)._scavMode='stealth';
            // 工具加成
            if(g.inventory.has('tool_lockpick',1)){ s.noise=0; s.duration=Math.floor(s.duration*0.8); }
            this.closeMenu(); this.openScavengeScene();
        },'噪音起始0·时间+50%·有开锁器时间-20%'+toolTip));
        this.menuDom.appendChild(mkBtn('🏃 快速搜索',()=>{
            (s as any)._scavMode='normal';
            this.closeMenu(); this.openScavengeScene();
        },'标准模式'+toolTip));
        this.menuDom.appendChild(mkBtn('🔨 强行搜刮',()=>{
            s.noise=50; s.duration=Math.floor(s.duration*0.7);
            (s as any)._scavMode='smash';
            if(g.inventory.get('tool_crowbar')>0) s.noise=30; // 撬棍降低噪音
            const r=s.getRegion(s.region);
            if(r) for(let i=0;i<3;i++){ const id=r.loot[Math.floor(Math.random()*r.loot.length)]; s.items.push({id,name:s.itemName(id),taken:false}); }
            this.closeMenu(); this.openScavengeScene();
        },'噪音起始50·时间-30%·有撬棍噪音-20'+toolTip));
        this.bindMenuOutsideClose();
    }

    // ============================== 搜刮场景 ==============================
    private scavSurvivorIdx = 0; // 搜刮出发的幸存者索引
    private openScavengeScene(){
        const alive = this.game.survivors.survivors.filter(s=>s.health>0);
        if(alive.length===0){ this.showMsg('无幸存者可出发'); return; }
        (window as any)._scavEvtShown = false; // 重置事件标志
        this.popupDom.style.display = 'none';
        this.popupTimer = 0;
        this._evtShown = false;
        this.scavReturnConfirm = false;
        this.scavOverlayDom.style.visibility = 'visible';
        this.scavRefreshTimer = 0;
        this.scavSurvivorIdx = this.game.survivors.survivors.indexOf(alive[0]);
        this.renderScavenge();
    }

    private renderScavenge(){
        if(this.scavOverlayDom.style.visibility === 'hidden') return;
        const s = this.game.scavenge;
        const r = s.getRegion(s.region);
        if(!r) return;

        // _deepChoice 不再是强制弹窗，改为右栏常驻按钮（见下方）
        if(s.completeFlag){
            const loot = this.game.lastScavengeLoot || {};
            let html = '<div style="font-size:16px;color:var(--f-accent);font-weight:bold;margin-bottom:6px;text-align:center">📦 搜刮完成</div>';
            html += `<div style="text-align:center;color:var(--f-dim);margin-bottom:10px;">${r.name} · 风险⚠${r.risk}</div>`;
            // 战利品面板
            html += '<div style="background:rgba(0,0,0,0.3);border-radius:8px;padding:8px;margin-bottom:8px;max-height:120px;overflow-y:auto">';
            const bpIds = Object.keys(s.backpack).sort((a,b)=>s.itemRarity(b)-s.itemRarity(a));
            if(bpIds.length > 0){
                html += '<div style="color:var(--f-warn);font-weight:bold;font-size:11px;margin-bottom:3px">🎒 拾取 (⚖' + s.currentWeight + ')</div>';
                html += '<div style="font-size:11px;line-height:1.4">';
                const rc = ['#90a890','#60b0f0','#f8c040'];
                for(const id of bpIds){
                    const c=rc[s.itemRarity(id)]||'var(--f-text)';
                    html+=`<span style="color:${c}">${s.itemName(id)}×${s.backpack[id]}</span> `;
                }
                html += '</div>';
            }
            const bonus = s.lastBonus || {};
            if(Object.keys(bonus).length > 0){
                html += '<div style="color:var(--f-dim);font-size:10px;margin-top:4px">🎁 奖励 ';
                for(const[id,qty] of Object.entries(bonus)) html+=`${this.itemName(id)}×${qty} `;
                html += '</div>';
            }
            if(bpIds.length===0&&Object.keys(bonus).length===0) html+='<div style="color:var(--f-dim)">空手而归...</div>';
            html += '</div>';
            html += '<button onclick="this.parentElement.style.visibility=\'hidden\'" class="frozen-bar-btn" style="width:100%">返回基地</button>';
            this.scavOverlayDom.innerHTML = html;
            return;
        }

        // 可选幸存者
        const alive = this.game.survivors.survivors.filter(s=>s.health>0);
        const sv = alive[0] || this.game.survivors.survivors[0];
        const depth = (s as any)._depth||0;
        // 顶栏：标题 + 幸存者
                // 区域特效标签
        let fxTags = '';
        const fx = s.regionFlags||{};
        if(fx.safe) fxTags += ' 🛡安全';
        if(fx.cold) fxTags += ' ❄️严寒';
        if(fx.toxic) fxTags += ' ☠️毒气';
        if(fx.reinforce) fxTags += ' ⚔️警戒';
        if(fx.heal) fxTags += ' 💊医疗';
        if(fx.hiddenLoot) fxTags += ' 🔬研究';
        let html = `<div style="font-size:16px;color:var(--f-accent);font-weight:bold;margin-bottom:2px">🔍 ${r.name}${depth>0?` 第${depth+1}层`:''}${fxTags}</div>`;
        html += `<div style="color:var(--f-dim);font-size:10px;margin-bottom:4px;line-height:1.35">${s.getRegionHint(s.region)}</div>`;
        if(sv) html += `<div style="color:var(--f-dim);margin-bottom:4px;font-size:11px">👤 ${sv.name} ❤${Math.round(sv.health)} 💪${sv.strength} 🎯${sv.perception}</div>`;
        if(alive.length>1){
            html += '<div style="display:flex;gap:4px;margin-bottom:6px">';
            for(let i=0;i<alive.length;i++){
                const a=alive[i];
                const sel=this.scavSurvivorIdx===this.game.survivors.survivors.indexOf(a);
                html+=`<button onclick="window._selScav(${i})" class="frozen-menu-btn" style="font-size:10px;${sel?'border-color:var(--f-accent);':'opacity:0.6'}">${a.name} ❤${Math.round(a.health)}</button>`;
            }
            html+='</div>';
            (window as any)._selScav=(i:number)=>{
                this.scavSurvivorIdx=this.game.survivors.survivors.indexOf(alive[i]);
                const sel = alive[i];
                s.maxWeight = 8 + (sel?sel.endurance:4) * 2;
                this.renderScavenge();
            };
        }

        // 主体：左栏(网格) + 右栏(信息)
        html += '<div style="display:flex;gap:8px">';
        // ===== 左栏：探索网格 =====
        html += '<div style="flex-shrink:0">';
        if(s.grid.length>0){
            const SZ=s.grid.length;
            const cellSize=7===SZ?36:48; // 7×7用36px, 5×5用48px
            const hasEnemies = s.enemies.filter(e=>!e.dead).length > 0;
            if(hasEnemies) html += '<div style="text-align:center;color:#f44;font-size:11px;margin-bottom:4px">⚔️ 战斗中无法移动</div>';
            html += `<div style="display:grid;grid-template-columns:repeat(${SZ},${cellSize}px);gap:3px;justify-content:center">`;
            for(let y=0;y<SZ;y++) for(let x=0;x<SZ;x++){
                const explored = s.gridExplored[y][x];
                const glimpsed = !explored && s.gridGlimpsed?.[y]?.[x];
                const isPlayer = s.gridPX===x && s.gridPY===y;
                const cell = explored ? s.grid[y][x] : glimpsed ? s.grid[y][x] : '?';
                const icons: Record<string,string> = {'?':'⬛','空':'⬜','货':'📦','敌':'👹','门':'🚁','墟':'🧱','冰':'❄️'};
                const colors: Record<string,string> = {'?':'#222','空':'#3a4a5a','货':'#4a6a3a','敌':'#6a3a3a','门':'#3a6a6a','墟':'#4a3a2a','冰':'#4a6a8a'};
                const clickable = !hasEnemies && (explored || glimpsed || Math.abs(x-s.gridPX)+Math.abs(y-s.gridPY)===1);
                const borderStyle = glimpsed ? '1px dashed #668' : `1px solid ${isPlayer?'var(--f-accent)':clickable?'#555':'#222'}`;
                const opacity = glimpsed ? 'opacity:0.55;' : '';
                const style = `width:${cellSize}px;height:${cellSize}px;background:${colors[cell]||'#333'};border:${borderStyle};${opacity}`+
                    `border-radius:4px;text-align:center;font-size:${cellSize>40?20:16}px;cursor:${clickable&&!isPlayer?'pointer':'default'};line-height:${cellSize}px`;
                if(clickable && !isPlayer){
                    html += `<div style="${style}" onclick="window._sGrid(${x},${y})">${icons[cell]}</div>`;
                } else {
                    html += `<div style="${style}">${isPlayer?'🧑':icons[cell]}</div>`;
                }
            }
            html += '</div>';
            (window as any)._sGrid = (x:number,y:number)=>{
                const r2 = s.moveTo(x,y,sv?sv.intelligence:4,sv?sv.trait:'');
                if(r2){
                    if(r2.blocked){ this.showMsg(r2.msg); this.renderScavenge(); return; }
                    this.showMsg(r2.msg);
                    if(r2.dmg && sv) sv.health = Math.max(0, sv.health - r2.dmg);
                    // 门格仅标记 _atExit，不强制撤离
                    // 高感知瞥见相邻未探索格（用实际位置，考虑冰面滑移）
                    if(sv && sv.perception>=6){
                        const sz=s.grid.length;
                        const px=s.gridPX, py=s.gridPY;
                        for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]){
                            const nx=px+dx, ny=py+dy;
                            if(nx>=0&&nx<sz&&ny>=0&&ny<sz&&!s.gridExplored[ny][nx]&&!s.gridGlimpsed[ny][nx]){
                                s.gridGlimpsed[ny][nx]=true;
                            }
                        }
                    }
                    // 探索新格子时触发事件（冷却随机2~5步，概率20%）
                    const cd=((s as any)._evtCd||0);
                    if(cd<=0 && r2.type!=='移' && Math.random()<0.2 && !(window as any)._scavEvtShown){
                        (s as any)._evtCd=2+Math.floor(Math.random()*4);
                        const reg=s.region;
                        const allEvents:{t:string;d:string;a:string;b:string;onA:()=>void;onB?:()=>void;reg?:string[]}[] = [
                            {t:'🚪 上锁的房间',d:'门后可能有稀有物资，但撬锁会产生噪音。',a:'🔓撬开(噪音+30)',b:'跳过',onA:()=>{s.noise+=30;const bps=['part_circuit','mat_metal','fuel_coal'];const bp=bps[Math.floor(Math.random()*bps.length)];s.addToBackpack(bp);s.addToBackpack(bp);}},
                            {t:'⚠ 不稳定结构',d:'天花板在摇晃，快速搜刮可能坍塌。',a:'⚡快速搜刮',b:'谨慎退出',onA:()=>{if(Math.random()<0.4){const dmg=5+Math.floor(Math.random()*10);sv.health=Math.max(0,sv.health-dmg);this.showMsg(`${sv.name}被砸伤了！`);}else{for(let k=0;k<4;k++)s.addToBackpack('mat_metal');}}},
                            {t:'📻 旧收音机',d:'角落里有一台还能用的收音机，拆零件还是试着收听？',a:'🔧拆零件',b:'📡收听',onA:()=>{s.addToBackpack('part_circuit');for(let k=0;k<3;k++)s.addToBackpack('part_wire');},onB:()=>{if(Math.random()<0.5) this.game.inventory.add('blueprint_radio',1);}},
                            // 区域专属事件
                            {t:'🧊 冰封储藏室',d:'废弃冰箱里还有保存完好的食物！',a:'🧥打包带走',b:'跳过',onA:()=>{s.addToBackpack('food_meat_frozen');s.addToBackpack('food_chocolate');},reg:['suburb','wilderness']},
                            {t:'💊 急救箱',d:'墙壁上挂着一个半满的急救箱。',a:'📦搜刮',b:'跳过',onA:()=>{s.addToBackpack('med_bandage');s.addToBackpack('med_antibiotic');if(Math.random()<0.3)s.addToBackpack('med_stimulant');},reg:['hospital']},
                            {t:'🏭 废弃机床',d:'一台还能运转的老旧机床，可以拆些零件。',a:'🔧拆卸',b:'跳过',onA:()=>{s.addToBackpack('part_circuit');s.addToBackpack('mat_metal');s.addToBackpack('mat_metal');},reg:['factory','storage']},
                            {t:'⚡ 漏电设备',d:'一台还在嗡嗡响的机器，靠近时火花四溅。',a:'⚡冒险搜刮',b:'远离',onA:()=>{if(Math.random()<0.5){const dmg=3+Math.floor(Math.random()*8);sv.health=Math.max(0,sv.health-dmg);this.showMsg(`${sv.name}被电击了！`);}else{s.addToBackpack('part_battery');s.addToBackpack('part_chip');}},reg:['research','military']},
                            {t:'💰 收银机',d:'柜台下发现一台被遗忘的收银机。',a:'🔨砸开',b:'跳过',onA:()=>{s.noise+=20;s.addToBackpack('food_ration');s.addToBackpack('food_chocolate');if(Math.random()<0.3)s.addToBackpack('part_battery');},reg:['commercial']},
                        ];
                        const candidates=allEvents.filter(e=>!e.reg||e.reg.includes(reg));
                        (window as any)._scavEvtShown=true;
                        (window as any)._scavEvtData=candidates[Math.floor(Math.random()*candidates.length)];
                        (window as any)._scavEvtA=()=>{(window as any)._scavEvtData.onA();(window as any)._scavEvtShown=false;this.renderScavenge();};
                        (window as any)._scavEvtB=()=>{if((window as any)._scavEvtData.onB){(window as any)._scavEvtData.onB();}(window as any)._scavEvtShown=false;this.renderScavenge();};
                    } else if(cd>0){ (s as any)._evtCd=cd-1; }
                }
                this.renderScavenge();
            };
        }

        html += '</div>'; // 关闭左栏
        // ===== 右栏：信息面板 =====
        html += '<div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;font-size:11px;overflow:hidden">';

        // 噪音条
        const nLv=s.noise>=90?'💀致命':s.noise>=70?'🔴危险':s.noise>=40?'🟡警告':'🟢安全';
        const nColor=s.noise>=90?'#f44':s.noise>=70?'#f84':s.noise>=40?'#fa4':'#4f4';
        const nBar=Math.min(10,Math.ceil(s.noise/10));
        html+=`<div style="background:rgba(0,0,0,0.3);border-radius:6px;padding:4px 6px">`;
        html+=`<span style="color:${nColor};font-weight:bold;font-size:12px">🔊 ${nLv}</span> `;
        html+=`<span style="font-size:10px;color:${nColor}">${'█'.repeat(nBar)}${'░'.repeat(10-nBar)} ${s.noise.toFixed(0)}</span>`;
        if(s.noise>=80) html+=`<div style="font-size:10px;color:#f44;text-align:center">⚠ 噪音过大，即将引来增援！</div>`;
        html+=`</div>`;

        // 战斗日志（颜色区分·滚动）
        if(s.recentMsgs.length>0){
            html+=`<div style="font-size:10px;max-height:48px;overflow-y:auto;line-height:1.3">`;
            for(const m of s.recentMsgs.slice(-4)){
                const mc=m.startsWith('⚔️ 击杀')?'#4f8':m.startsWith('👹')?'#f66':m.startsWith('🚨')?'#f44':m.startsWith('⚠')?'#fa4':'var(--f-dim)';
                html+=`<div style="color:${mc}">${m}</div>`;
            }
            html+=`</div>`;
        }

        // Enemies (自动战斗 — 仅显示状态)
        const alives = s.enemies.filter(e=>!e.dead);
        if(alives.length > 0){
            html += '<div style="color:var(--f-danger);font-weight:bold;font-size:11px">⚠ 战斗中…</div>';
            html += '<div style="display:flex;flex-wrap:wrap;gap:4px;max-height:60px;overflow-y:auto">';
            alives.forEach(e=>{
                const hpPct = Math.max(0, Math.round(e.hp/e.maxHp*100));
                const barColor = hpPct>50?'#4a4':hpPct>25?'#aa4':'#a44';
                html += `<div style="flex:0 0 auto;min-width:80px;background:rgba(30,10,10,0.7);border:1px solid #622;border-radius:6px;padding:4px 6px">`;
                html += `<div style="font-size:11px;color:var(--f-dim)">${s.enemyName(e.type||'')}</div>`;
                html += `<div style="display:flex;align-items:center;gap:4px;margin-top:2px">`;
                html += `<div style="flex:1;height:4px;background:rgba(0,0,0,0.4);border-radius:2px"><div style="width:${hpPct}%;height:100%;background:${barColor};border-radius:2px"></div></div>`;
                html += `<span style="font-size:9px;color:var(--f-dim)">${hpPct}%</span></div></div>`;
            });
            html += '</div>';
        }

        // Items (按稀有度排序)
        const rColors = ['#90a890','#60b0f0','#f8c040']; // 0普通 1罕见 2稀有
        html += '<div style="color:var(--f-dim);font-size:11px">📦 地面物品</div>';
        const sortedItems = s.items.map((item,i)=>({item,i})).filter(o=>!o.item.taken).sort((a,b)=>s.itemRarity(b.item.id)-s.itemRarity(a.item.id));
        sortedItems.forEach(o=>{
            const r=s.itemRarity(o.item.id);
            html += `<button onclick="window._scavPickup(${o.i})" class="frozen-menu-btn" style="margin:2px;border-color:${rColors[r]}">${o.item.name}</button>`;
        });
        (window as any)._scavPickup = (i:number)=>{
            const err = s.pickup(i,sv?sv.trait:'');
            if(err) this.showMsg(err);
            this.renderScavenge();
        };
        // Backpack (按稀有度排序)
        const bpIds = Object.keys(s.backpack).sort((a,b)=>s.itemRarity(b)-s.itemRarity(a));
        html += `<div style="color:var(--f-dim);font-size:11px">🎒 背包 ${bpIds.length}/${s.maxSlots}种 · ⚖${s.currentWeight}/${s.maxWeight}</div>`;
        bpIds.forEach(id=>{
            const r=s.itemRarity(id);
            html += `<button onclick="window._scavDiscard('${id}')" class="frozen-menu-btn" style="margin:2px;font-size:10px;border-color:${rColors[r]}">${s.itemName(id)} ×${s.backpack[id]}</button>`;
        });
        (window as any)._scavDiscard = (id:string)=>{
            const ok = s.discard(id);
            if(ok) this.showMsg(`丢弃 ${s.itemName(id)}`);
            this.renderScavenge();
        };

        // 深入探索按钮（时间到后常驻右栏）
        if((s as any)._deepChoice && !s.completeFlag){
            const dd=(s as any)._depth||0;
            if(dd<5){
                html+=`<button onclick="window._scavDeeper()" class="frozen-bar-btn" style="width:100%;background:linear-gradient(180deg,#502020,#301010);border-color:#a44;font-size:12px">🔍 深入探索（第${dd+2}层）</button>`;
            }
        }

        // 撤离点到达提示
        if((s as any)._atExit){
            html+=`<div style="text-align:center;color:#4f8;font-size:12px;font-weight:bold">🚁 可撤离！</div>`;
        }

        // 事件触发已移至 _sGrid 移动回调中（探索新格子时触发，有冷却）
        if((window as any)._scavEvtShown){
            const evt=(window as any)._scavEvtData;
            html+=`<div style="padding:6px;background:rgba(40,30,20,0.6);border:1px solid var(--f-warn);border-radius:6px;font-size:11px">`;
            html+=`<div style="color:var(--f-warn);font-weight:bold;margin-bottom:2px">${evt.t}</div>`;
            html+=`<div style="color:var(--f-dim);margin-bottom:4px">${evt.d}</div>`;
            html+=`<button onclick="window._scavEvtA()" class="frozen-menu-btn" style="margin-right:3px;font-size:11px">${evt.a}</button>`;
            html+=`<button onclick="window._scavEvtB()" class="frozen-menu-btn" style="font-size:11px">${evt.b}</button></div>`;
        }
        html += '</div>'; // 关闭右栏
        html += '</div>'; // 关闭主flex
        const atExit = (s as any)._atExit;
        const btnLabel = this.scavReturnConfirm ? '⚠ 确认撤离' : atExit ? '🚁 撤离' : '🏠 返回基地';
        const btnColor = this.scavReturnConfirm
            ? 'background:linear-gradient(180deg,#602020,#301010);border-color:#a44'
            : atExit ? 'background:linear-gradient(180deg,#204020,#103010);border-color:#4a4' : '';
        html += `<br><button id="scavReturnBtn" class="frozen-bar-btn" style="width:100%;${btnColor}" onclick="window._scavReturn()">${btnLabel}</button>`;
        (window as any)._scavReturn = ()=>{
            if(!this.scavReturnConfirm){
                this.scavReturnConfirm = true;
                this.renderScavenge();
                return;
            }
            if(this.game.scavenge.active){
                this.game.finishScavenge();
                if(this.game.scavenge.active){
                    this.game.scavenge.completeFlag = true;
                    this.game.scavenge.active = false;
                    this.game.lastScavengeLoot = {_empty:1};
                }
            }
            this.scavReturnConfirm = false;
            this.renderScavenge();
        };
        (window as any)._scavDeeper = ()=>{
            const selSv = this.game.survivors.survivors[this.scavSurvivorIdx] || sv;
            if(!selSv||selSv.health<=0){ this.showMsg('幸存者已倒下'); return; }
            const lv = ((s as any)._depth = ((s as any)._depth||0) + 1);
            if(lv > 5){ this.showMsg('已达最深区域，无法继续深入'); return; }
            (s as any)._deepChoice=false;
            s.timer=0; s.noise+=20;
            s.depletion[s.region] = Math.min(100, (s.depletion[s.region]||0) + 8);
            (s as any)._atExit=false;
            s.initGrid();
            const regionTypes: Record<string,string[]> = {
                suburb:['frozen','wolf','scavenger'],wilderness:['wolf','bat','hound'],
                commercial:['scavenger','bat','frozen'],storage:['frozen','hound','scavenger'],
                hospital:['scavenger','bat','frozen'],factory:['hound','scavenger','bat'],
                military:['raider','hound','wolf'],research:['bat','scavenger','frozen'],
            };
            const types=regionTypes[s.region]||['frozen','wolf','scavenger'];
            const extra = 1+Math.floor(Math.random()*2);
            const depthMult = 1 + lv * 0.2;
            for(let i=0;i<extra;i++){ const ht=Math.floor((15+Math.floor(Math.random()*20))*depthMult); s.enemies.push({hp:ht,maxHp:ht,type:types[Math.floor(Math.random()*types.length)]}); }
            this.showMsg(`🔍 深入第${lv+1}层！敌人更强`);
            this.renderScavenge();
        };

        this.scavOverlayDom.innerHTML = html;
    }

    // ============================== 科技树总览 ==============================
    private showTechTree(){
        const g = this.game;
        this.menuDom.innerHTML = '';
        this.menuDom.style.display = 'flex';
        this.menuDom.dataset.type = 'techtree';

        const allBps = ['blueprint_coal','blueprint_greenhouse','blueprint_boiler','blueprint_radio'];
        const bpNames: Record<string,string> = {
            blueprint_coal:'🔥 煤炉',blueprint_greenhouse:'🌱 温室',
            blueprint_boiler:'🏭 锅炉',blueprint_radio:'📡 无线电',
        };

        let html = '<div style="text-align:center;width:100%">';
        html += '<div style="color:var(--f-accent);font-size:14px;font-weight:bold;margin-bottom:8px">🔬 科技树</div>';
        html += '<div style="color:var(--f-dim);font-size:10px;margin-bottom:10px">工坊 ── 解读蓝图解锁科技</div>';

        for(const bp of allBps){
            const name = bpNames[bp]||bp;
            const unlocked = this.unlocked.has(bp);
            const inInv = g.inventory.get(bp) > 0;
            const prereq = g.checkBlueprintPrereqs(bp, this.unlocked);
            const locked = prereq !== null;

            let status: string, color: string, icon: string;
            if(unlocked){
                status = '已解锁'; color='var(--f-success)'; icon='✅';
            } else if(inInv && !locked){
                status = '可解读'; color='var(--f-warn)'; icon='📘';
            } else if(inInv && locked){
                status = prereq||'锁定'; color='var(--f-dim)'; icon='🔒';
            } else {
                status = '未获得'; color='var(--f-dim)'; icon='⬜';
            }
            html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid var(--f-border);color:${color}">`+
                `<span>${icon} ${name}</span><span style="font-size:10px">${status}</span></div>`;
        }

        // T4+ 高级建筑（无需蓝图，有前置条件）
        html += '<div style="color:var(--f-accent);font-size:12px;font-weight:bold;margin-top:12px;margin-bottom:4px">🏗 高级建筑</div>';
        const advanced = [
            {name:'🏗 地下墙', cond: '保温90% · 直接建造', unlocked: true},
            {name:'🌋 地热井', cond: '需先建造锅炉', unlocked: g.build.hasBoiler()},
            {name:'🔫 炮塔', cond: '需先建造工坊', unlocked: g.build.hasWorkshop()},
        ];
        for(const a of advanced){
            const color = a.unlocked ? 'var(--f-success)' : 'var(--f-dim)';
            const icon = a.unlocked ? '✅' : '🔒';
            html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid var(--f-border);color:${color}">`+
                `<span>${icon} ${a.name}</span><span style="font-size:10px">${a.unlocked?'已解锁':a.cond}</span></div>`;
        }

        html += '<br><div style="color:var(--f-dim);font-size:10px">锅炉/无线电 需要先解锁煤炉</div>';
        html += '</div>';
        this.menuDom.innerHTML = html;

        setTimeout(()=>{
            const hide = (ev: MouseEvent) => {
                if(!this.menuDom?.contains(ev.target as Node)){
                    this.closeMenu();
                    document.removeEventListener('click', hide);
                }
            };
            document.addEventListener('click', hide);
        }, 100);
    }

    // ============================== v1 完成度 ==============================
    private showVersionPanel(){
        this.menuDom.innerHTML = '';
        this.menuDom.style.display = 'flex';
        this.menuDom.dataset.type = 'version';
        this.menuDom.style.width = '560px';
        this.menuDom.style.marginLeft = '-280px';

        let html = '<div style="text-align:left;width:100%;max-height:460px;overflow-y:auto;padding-right:4px">';
        html += `<div style="display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:8px">`+
            `<span style="color:var(--f-accent);font-size:14px;font-weight:bold">📋 版本计划</span>`+
            `<span style="color:var(--f-warn);font-size:11px">${this.version.current} → ${this.version.next}</span></div>`;
        html += `<div style="color:var(--f-dim);font-size:10px;line-height:1.5;margin-bottom:8px">GitHub：${this.version.github}</div>`;

        for(const m of this.version.milestones){
            const color = this.version.getStatusColor(m.status);
            html += `<div style="padding:7px 0;border-bottom:1px solid var(--f-border)">`+
                `<div style="display:flex;justify-content:space-between;gap:10px;align-items:center;color:${color}">`+
                `<span style="font-weight:bold">${m.version} · ${m.title}</span>`+
                `<span style="font-size:10px">${this.version.getStatusLabel(m.status)}</span></div>`;
            html += `<div style="color:var(--f-text);font-size:10px;line-height:1.45;margin-top:4px">目标：${m.goals.join(' / ')}</div>`;
            html += `<div style="color:var(--f-dim);font-size:10px;line-height:1.45;margin-top:2px">验收：${m.acceptance.join('；')}</div>`;
            html += '</div>';
        }

        html += '<div style="margin-top:10px;padding:7px;background:rgba(0,0,0,0.25);border:1px solid var(--f-border);border-radius:6px;color:var(--f-dim);font-size:10px;line-height:1.5">每完成一个版本节点，会同步提交并推送到 GitHub；正式版本再打 tag。</div>';
        html += '</div>';
        this.menuDom.innerHTML = html;
        this.bindMenuOutsideClose();
    }

    private showCompletionPanel(){
        const status = this.game.getCompletionStatus();
        this.menuDom.innerHTML = '';
        this.menuDom.style.display = 'flex';
        this.menuDom.dataset.type = 'completion';
        this.menuDom.style.width = '560px';
        this.menuDom.style.marginLeft = '-280px';

        const color = status.score >= 90 ? 'var(--f-success)' : status.score >= 70 ? 'var(--f-warn)' : 'var(--f-text)';
        let html = '<div style="text-align:left;width:100%;max-height:460px;overflow-y:auto;padding-right:4px">';
        html += `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">`+
            `<span style="color:var(--f-accent);font-size:14px;font-weight:bold">✅ v1.0 完成度</span>`+
            `<span style="color:${color};font-size:13px;font-weight:bold">${status.score}% · ${status.grade}</span></div>`;
        html += `<div style="color:var(--f-warn);font-size:11px;line-height:1.5;margin-bottom:8px">下一步：${status.nextAction}</div>`;
        html += `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px">`+
            `<button class="frozen-menu-btn" onclick="event.stopPropagation();window._frostQa('kit')">🧪 测试包</button>`+
            `<button class="frozen-menu-btn" onclick="event.stopPropagation();window._frostQa('days',7)">⏩ 快进7天</button>`+
            `<button class="frozen-menu-btn" onclick="event.stopPropagation();window._frostQa('roundtrip')">💾 存读测试</button>`+
            `<button class="frozen-menu-btn" onclick="event.stopPropagation();window._frostQa('p0')">✅ 一周烟测</button>`+
            `</div>`;

        for(const priority of ['P0','P1','P2'] as const){
            const group = status.items.filter(i=>i.priority===priority);
            html += `<div style="color:var(--f-accent);font-size:11px;font-weight:bold;margin-top:8px">${priority}</div>`;
            for(const item of group){
                const itemColor = item.done ? 'var(--f-success)' : priority==='P0' ? 'var(--f-warn)' : 'var(--f-text)';
                html += `<div style="padding:5px 0;border-bottom:1px solid var(--f-border);color:${itemColor}">`+
                    `<div style="display:flex;justify-content:space-between;gap:10px"><span>${item.done?'✅':'○'} ${item.title}</span><span style="font-size:10px">${item.done?'完成':'待测'}</span></div>`+
                    `<div style="color:var(--f-dim);font-size:10px;line-height:1.45;margin-top:2px">${item.detail}</div></div>`;
            }
        }

        if(status.risks.length > 0){
            html += '<div style="color:var(--f-danger);font-size:11px;font-weight:bold;margin-top:10px">当前风险</div>';
            for(const risk of status.risks) html += `<div style="color:var(--f-dim);font-size:10px;line-height:1.45">• ${risk}</div>`;
        }
        html += '<div style="margin-top:10px;padding:7px;background:rgba(0,0,0,0.25);border:1px solid var(--f-border);border-radius:6px;color:var(--f-dim);font-size:10px;line-height:1.5">测试助手：控制台可用 window._frostDebug.kit() / days(7) / roundtrip() / p0() / status()</div>';
        html += '</div>';
        this.menuDom.innerHTML = html;

        setTimeout(()=>{
            const hide = (ev: MouseEvent) => {
                if(!this.menuDom?.contains(ev.target as Node)){
                    this.closeMenu();
                    document.removeEventListener('click', hide);
                }
            };
            document.addEventListener('click', hide);
        }, 100);
    }

    // ============================== 长线目标 ==============================
    private showLongTermPanel(){
        const status = this.game.getLongTermStatus();
        const world = this.game.getWorldStatus();
        const prod = this.game.getProductionStatus();
        this.menuDom.innerHTML = '';
        this.menuDom.style.display = 'flex';
        this.menuDom.dataset.type = 'longterm';

        let html = '<div style="text-align:left;width:100%;max-height:420px;overflow-y:auto;padding-right:4px">';
        html += `<div style="color:var(--f-accent);font-size:14px;font-weight:bold;margin-bottom:6px">📜 ${status.summary}</div>`;
        html += `<div style="color:var(--f-text);font-size:11px;margin-bottom:4px">🗺 ${world.summary}</div>`;
        html += `<div style="color:var(--f-text);font-size:11px;margin-bottom:8px">🏭 ${prod.summary}</div>`;
        html += '<div style="color:var(--f-dim);font-size:10px;margin-bottom:10px">长期目标会随基地建设、远征、人口和通讯进度推进</div>';

        for(const goal of status.goals){
            const color = goal.done ? 'var(--f-success)' : 'var(--f-text)';
            const icon = goal.done ? '✅' : '○';
            html += `<div style="padding:6px 0;border-bottom:1px solid var(--f-border);color:${color}">`+
                `<div style="display:flex;justify-content:space-between;gap:10px;align-items:center">`+
                `<span style="font-weight:bold">${icon} ${goal.title}</span>`+
                `<span style="font-size:10px;color:${goal.done?'var(--f-success)':'var(--f-dim)'}">${goal.done?'完成':'推进中'}</span>`+
                `</div><div style="font-size:10px;color:var(--f-dim);line-height:1.5;margin-top:2px">${goal.desc}</div></div>`;
        }

        if(status.nextGoal){
            html += `<div style="margin-top:10px;color:var(--f-warn);font-size:11px">下一步：${status.nextGoal.title}</div>`;
        } else {
            html += '<div style="margin-top:10px;color:var(--f-success);font-size:11px">当前长线目标已全部完成</div>';
        }
        html += '</div>';
        this.menuDom.innerHTML = html;

        setTimeout(()=>{
            const hide = (ev: MouseEvent) => {
                if(!this.menuDom?.contains(ev.target as Node)){
                    this.closeMenu();
                    document.removeEventListener('click', hide);
                }
            };
            document.addEventListener('click', hide);
        }, 100);
    }

    // ============================== 世界网络 ==============================
    private showWorldPanel(){
        const g = this.game;
        const world = g.getWorldStatus();
        const prod = g.getProductionStatus();
        this.menuDom.innerHTML = '';
        this.menuDom.style.display = 'flex';
        this.menuDom.dataset.type = 'world';
        this.menuDom.style.width = '520px';
        this.menuDom.style.marginLeft = '-260px';

        let html = '<div style="text-align:left;width:100%;max-height:460px;overflow-y:auto;padding-right:4px">';
        html += `<div style="color:var(--f-accent);font-size:14px;font-weight:bold;margin-bottom:4px">🗺 ${world.summary}</div>`;
        html += `<div style="color:var(--f-dim);font-size:10px;margin-bottom:8px">商队 ${world.factions.caravan.toFixed(0)} · 工程师 ${world.factions.engineers.toFixed(0)} · 自由聚落 ${world.factions.freeSettlement.toFixed(0)}</div>`;
        html += `<div style="color:var(--f-text);font-size:11px;margin-bottom:10px">🏭 ${prod.summary} · 昨日产出：${g.outposts.lastProduction.summary}</div>`;

        for(const def of g.outposts.getDefs()){
            const state = g.outposts.getState(def.id);
            const err = g.outposts.canBuild(def.id, g.getOutpostContext());
            const cost = Object.entries(def.cost).map(([id, qty])=>`${this.itemName(id)}×${qty}`).join(' ');
            const output = Object.entries(def.output).map(([id, qty])=>`${this.itemName(id)}×${qty}`).join(' ');
            const color = state.built ? 'var(--f-success)' : err ? 'var(--f-dim)' : 'var(--f-warn)';
            html += `<div style="padding:8px 0;border-bottom:1px solid var(--f-border);color:${color}">`+
                `<div style="display:flex;justify-content:space-between;gap:10px;align-items:center">`+
                `<span style="font-weight:bold">${state.built?'✅':'○'} ${def.name}</span>`+
                `<span style="font-size:10px">${state.built?`Lv${state.level} 安${state.safety.toFixed(0)} 维${state.maintenance.toFixed(0)} 补${state.supply.toFixed(0)}`:(err||'可建设')}</span>`+
                `</div>`+
                `<div style="font-size:10px;color:var(--f-dim);line-height:1.45;margin-top:3px">${def.desc}</div>`+
                `<div style="font-size:10px;color:var(--f-dim);line-height:1.45">成本：${cost}</div>`+
                `<div style="font-size:10px;color:var(--f-dim);line-height:1.45">产出：${output} / 天 · 解锁：${def.unlock}</div>`;
            if(!state.built && !err){
                html += `<button class="frozen-menu-btn" style="margin-top:6px" onclick="event.stopPropagation();window._buildOutpost('${def.id}')">建设</button>`;
            }
            html += '</div>';
        }

        html += '<button class="frozen-menu-btn" style="margin-top:10px;width:100%" onclick="event.stopPropagation();window._resupplyOutposts()">补给全部哨站（木材20 金属5）</button>';
        html += '</div>';
        this.menuDom.innerHTML = html;

        (window as any)._buildOutpost = (id: OutpostId) => {
            const err = g.buildOutpost(id);
            this.showMsg(err || '外部哨站已建立');
            this.showWorldPanel();
        };
        (window as any)._resupplyOutposts = () => {
            const err = g.resupplyOutposts();
            this.showMsg(err || '外部哨站已补给');
            this.showWorldPanel();
        };

        setTimeout(()=>{
            const hide = (ev: MouseEvent) => {
                if(!this.menuDom?.contains(ev.target as Node)){
                    this.closeMenu();
                    document.removeEventListener('click', hide);
                }
            };
            document.addEventListener('click', hide);
        }, 100);
    }

    // ============================== 蓝图选择 ==============================
    private showBlueprintChoiceMenu(bps: string[]){
        const g = this.game;
        // 过滤掉已解锁的蓝图，只显示未学的
        const unlearned = bps.filter(bp => !this.unlocked.has(bp));
        if(unlearned.length === 0){
            this.showMsg('所有蓝图均已解读');
            this.closeMenu();
            return;
        }

        this.menuDom.innerHTML = '';
        this.menuDom.style.display = 'flex';
        this.menuDom.dataset.type = 'blueprint';

        const mkBtn = (text:string, fn:()=>void, tip?:string) => {
            const btn = document.createElement('button');
            btn.innerHTML = text;
            btn.className = 'frozen-menu-btn';
            btn.addEventListener('click', (e)=>{ e.stopPropagation(); fn(); });
            if(tip){
                btn.style.position='relative';
                const d=document.createElement('div');
                d.textContent=tip;
                d.style.cssText='display:none;position:absolute;bottom:110%;left:50%;transform:translateX(-50%);background:rgba(8,16,28,0.97);color:#c0daf0;font:11px monospace;padding:6px 10px;border-radius:6px;border:1px solid #2a5a8a;white-space:pre-line;z-index:9999;pointer-events:none;min-width:100px;text-align:left;';
                btn.addEventListener('mouseenter',()=>{d.style.display='block';});
                btn.addEventListener('mouseleave',()=>{d.style.display='none';});
                btn.appendChild(d);
            }
            return btn;
        };

        this.menuDom.appendChild(mkBtn(`📘 选择要解读的蓝图（${unlearned.length}种未学）`, ()=>{}));
        for(const bp of unlearned){
            const name = this.itemName(bp);
            const desc = this.itemDesc(bp);
            const preReq = g.checkBlueprintPrereqs(bp, this.unlocked);
            const locked = preReq !== null;
            const label = locked ? `🔒 ${name}（需要前置技术）` : `${name}`;
            const tip = locked ? `${desc}\n⚠ ${preReq}` : desc;
            this.menuDom.appendChild(mkBtn(label, ()=>{
                if(this.unlocked.has(bp)){ this.showMsg('已解读过该蓝图'); this.closeMenu(); return; }
                if(locked){ this.showMsg(preReq); return; }
                const r = g.interpretBlueprint(bp);
                if(r && r.startsWith('blueprint_')){
                    this.unlocked.add(r);
                    this.showMsg(`🔓 ${name} 已解读`);
                } else {
                    this.showMsg(r||'解读失败');
                }
                this.closeMenu();
            }, tip));
            if(locked){
                // 样式标记为灰色
                const lastBtn = this.menuDom.lastChild as HTMLElement;
                if(lastBtn) lastBtn.style.opacity = '0.5';
            }
        }

        setTimeout(()=>{
            const hide = (ev: MouseEvent) => {
                if(!this.menuDom?.contains(ev.target as Node)){
                    this.closeMenu();
                    document.removeEventListener('click', hide);
                }
            };
            document.addEventListener('click', hide);
        }, 100);
    }

    // ============================== 载具升级 ==============================
    private showUpgradeMenu(){
        const g = this.game;
        if(!g.vehicle.current){ this.showMsg('没有载具可升级'); return; }
        const avails = g.vehicle.getAvailableUpgrades();
        if(avails.length === 0){ this.showMsg('该载具已无可用升级'); return; }

        this.menuDom.innerHTML = '';
        this.menuDom.style.display = 'flex';
        this.menuDom.dataset.type = 'upgrade';

        const mkBtn = (text:string, fn:()=>void, tip?:string) => {
            const btn = document.createElement('button');
            btn.innerHTML = text;
            btn.className = 'frozen-menu-btn';
            btn.addEventListener('click', (e)=>{ e.stopPropagation(); fn(); });
            if(tip){
                btn.style.position='relative';
                const d=document.createElement('div');
                d.textContent=tip;
                d.style.cssText='display:none;position:absolute;bottom:110%;left:50%;transform:translateX(-50%);background:rgba(8,16,28,0.97);color:#c0daf0;font:11px monospace;padding:6px 10px;border-radius:6px;border:1px solid #2a5a8a;white-space:pre-line;z-index:9999;pointer-events:none;min-width:100px;text-align:left;';
                btn.addEventListener('mouseenter',()=>{d.style.display='block';});
                btn.addEventListener('mouseleave',()=>{d.style.display='none';});
                btn.appendChild(d);
            }
            return btn;
        };

        const vName = g.vehicle.getDef(g.vehicle.current)?.name||'载具';
        this.menuDom.appendChild(mkBtn(`⬆ ${vName} 升级`, ()=>{})); // title

        for(const u of avails){
            let tip = u.desc;
            for(const [id,n] of Object.entries(u.cost)){
                const have = Math.round(g.inventory.get(id));
                tip += `\n${have>=n?'✅':'❌'} ${this.itemName(id)} ${have}/${n}`;
            }
            this.menuDom.appendChild(mkBtn(u.name, ()=>{
                for(const[id,qty] of Object.entries(u.cost)){
                    if(!g.inventory.has(id,qty)){ this.showMsg(`${this.itemName(id)}不足`); this.closeMenu(); return; }
                }
                for(const[id,qty] of Object.entries(u.cost)) g.inventory.remove(id,qty);
                g.vehicle.installUpgrade(u.id);
                this.showMsg(`✅ ${u.name} 已安装（${u.desc}）`);
                this.closeMenu();
            }, tip));
        }

        setTimeout(()=>{
            const hide = (ev: MouseEvent) => {
                if(!this.menuDom?.contains(ev.target as Node)){
                    this.closeMenu();
                    document.removeEventListener('click', hide);
                }
            };
            document.addEventListener('click', hide);
        }, 100);
    }

    // ============================== 标题画面 ==============================
    private titleScreenDom!: HTMLDivElement;
    private showTitleScreen(){
        const hasSave = !!localStorage.getItem('frost_save');
        this.titleScreenDom = document.createElement('div');
        this.titleScreenDom.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:2000;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(4,10,20,0.97);';
        this.titleScreenDom.innerHTML = `
            <div style="font-size:48px;font-weight:bold;color:var(--f-accent);margin-bottom:4px;text-shadow:0 0 30px rgba(80,180,255,0.5)">❄️ 极寒末世</div>
            <div style="color:var(--f-dim);font-size:14px;margin-bottom:40px">Frozen Wasteland</div>
            <div id="title-btns" style="display:flex;flex-direction:column;gap:12px;min-width:240px">
                <button class="frozen-bar-btn" style="font-size:18px;padding:14px">🆕 新的求生</button>
                ${hasSave ? '<button class="frozen-bar-btn" style="font-size:18px;padding:14px">📂 继续旅程</button>' : ''}
                <button class="frozen-bar-btn" style="font-size:18px;padding:14px;opacity:0.7">⚙️ 难度: ${({easy:'🟢简单',normal:'🟡普通',hard:'🔴困难',nightmare:'💀噩梦',apocalypse:'☠️启示录'}[this.game.difficulty]||'🟡普通')}</button>
            </div>
            <div style="color:var(--f-dim);font-size:10px;margin-top:30px">v1.0 · Cocos Creator · 2026</div>
        `;
        document.body.appendChild(this.titleScreenDom);

        // 绑定按钮
        const btns = this.titleScreenDom.querySelectorAll('button');
        btns[0].onclick = () => this.startNewGame();
        if(btns[1] && btns[1].textContent?.includes('继续')){
            btns[1].onclick = () => this.loadSavedGame();
        }
        // 难度按钮
        const diffBtn = btns[btns.length-1];
        diffBtn.onclick = () => this.cycleDifficulty();
    }

    private startNewGame(){
        this.closeTransientUi();
        this.titleScreenDom.style.display = 'none';
        // 重新创建游戏
        this.game = new GameManager(localStorage.getItem('frost_diff') as any || 'normal');
        this.game.setUnlockedBlueprints(this.unlocked);
        this.game.time.isPaused = false;
        (window as any).game = this.game;
        this.showMsg('🔥 第1天 · 活下去');
    }

    private loadSavedGame(){
        const data = this.readLocalSaveData();
        if(!data) return;
        const err = this.game.load(JSON.stringify(data));
        if(err){ this.showMsg(err); return; }
        this.afterLoadSync(data);
        this.closeTransientUi();
        this.titleScreenDom.style.display = 'none';
        this.game.time.isPaused = false;
        this.showMsg('📂 存档已读取');
    }

    private cycleDifficulty(){
        const diffs: Array<'easy'|'normal'|'hard'|'nightmare'|'apocalypse'> = ['easy','normal','hard','nightmare','apocalypse'];
        const idx = diffs.indexOf(this.game.difficulty as any);
        const next = diffs[(idx+1)%diffs.length];
        this.game.difficulty = next;
        this.game.combat.diffMult = this.game.diffMult();
        localStorage.setItem('frost_diff', next);
        const labels: Record<string,string> = {easy:'🟢简单',normal:'🟡普通',hard:'🔴困难',nightmare:'💀噩梦',apocalypse:'☠️启示录'};
        const btn = this.titleScreenDom.querySelectorAll('button')[this.titleScreenDom.querySelectorAll('button').length-1];
        if(btn) btn.textContent = `⚙️ 难度: ${labels[next]}`;
        this.showMsg(`难度: ${labels[next]}`);
    }

    private showEndingStats(ending: any){
        const g = this.game;
        const s = g.stats;
        const labels: Record<string,string> = {easy:'🟢简单',normal:'🟡普通',hard:'🔴困难',nightmare:'💀噩梦',apocalypse:'☠️启示录'};
        this.popupText.innerHTML = `<div style="color:var(--f-accent);font-size:20px;font-weight:bold;margin-bottom:6px">📊 ${ending.title}</div>
            <div style="color:var(--f-dim);margin-bottom:12px">${ending.subtitle}</div>
            <div style="background:rgba(0,0,0,0.3);border-radius:8px;padding:12px;margin-bottom:12px;text-align:left;font-size:13px;line-height:2">
            <div>📅 存活天数: <b>${s.totalDaysPlayed || g.time.day}</b></div>
            <div>👥 最终幸存者: <b>${g.survivors.survivors.length}</b></div>
            <div>💀 失去的同伴: <b>${s.survivorsLost}</b></div>
            <div>🧱 建造墙壁: <b>${s.wallsBuilt}</b></div>
            <div>🏗 建造设施: <b>${s.facilitiesBuilt}</b></div>
            <div>📦 完成搜刮: <b>${s.scavengesDone}</b></div>
            <div>⚙ 难度: <b>${labels[g.difficulty]||g.difficulty}</b></div>
            </div>`;
        this.popupBtnA.textContent = '🔄 再来一局';
        this.popupBtnA.onclick = () => { this.popupDom.style.display = 'none'; this._evtShown = false; this.returnToTitle(); };
        this.popupBtnB.style.display = 'none';
    }

    private returnToTitle(){
        this.game.time.isPaused = true;
        this.closeTransientUi();
        // 重新创建游戏（下次点击新游戏时才真正重置）
        if(this.titleScreenDom) this.titleScreenDom.style.display = 'flex';
    }

    // ============================== 难度 ==============================
    private showPauseMenu(){
        this.game.time.isPaused = true;
        this.pauseDom.style.display = 'flex';
    }
    private resumeGame(){
        this.game.time.isPaused = false;
        this.pauseDom.style.display = 'none';
    }
    private onPauseAction(action: string){
        if(action === 'resume'){ this.resumeGame(); }
        else if(action === 'save'){
            this.game.saveLocal({unlocked:[...this.unlocked]});
            this.showMsg('💾 已保存');
            this.resumeGame();
        } else if(action === 'load'){
            const data = this.readLocalSaveData();
            if(!data) return;
            const err = this.game.load(JSON.stringify(data));
            if(err){ this.showMsg(err); return; }
            this.afterLoadSync(data);
            this.showMsg('📂 已读取');
            this.resumeGame();
        } else if(action === 'title'){
            this.returnToTitle();
        }
    }

    private showDifficultyPicker(){
        this._evtShown = true;
        const cur = this.game.difficulty;
        this.popupText.innerHTML = `<div style="color:var(--f-accent);font-size:18px;font-weight:bold;margin-bottom:8px">⚙️ 选择难度（当前: ${{easy:'🟢简单',normal:'🟡普通',hard:'🔴困难',nightmare:'💀噩梦',apocalypse:'☠️启示录'}[cur]||cur}）</div><div style="color:var(--f-dim);margin-bottom:12px">难度影响资源消耗和敌人强度 · 立即生效</div>`;
        this.popupBtnA.style.display = 'none';
        this.popupBtnB.style.display = 'none';

        // 三个难度按钮直接放进 popupText
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;gap:10px;justify-content:center;margin-top:8px';
        const mkDiffBtn = (label:string, d:'easy'|'normal'|'hard'|'nightmare'|'apocalypse', desc:string) => {
            const btn = document.createElement('button');
            btn.textContent = label;
            btn.title = desc;
            btn.className = 'frozen-bar-btn';
            btn.style.cssText = 'flex:1;font-size:15px;padding:10px';
            btn.onclick = () => {
                localStorage.setItem('frost_diff', d);
                this._evtShown = false;
                this.popupDom.style.display = 'none';
                this.game.difficulty = d;
                this.game.combat.diffMult = this.game.diffMult();
                this.showMsg(`难度: ${label}`);
            };
            return btn;
        };
        row.appendChild(mkDiffBtn('🟢 简单', 'easy', '资源消耗×0.7 初始物资×1.5'));
        row.appendChild(mkDiffBtn('🟡 普通', 'normal', '标准难度'));
        row.appendChild(mkDiffBtn('🔴 困难', 'hard', '资源消耗×1.3 初始物资×0.7'));
        const row2 = document.createElement('div');
        row2.style.cssText = 'display:flex;gap:10px;justify-content:center;margin-top:6px';
        row2.appendChild(mkDiffBtn('💀 噩梦', 'nightmare', '消耗×1.6·健康-35%·初始物资×0.5'));
        row2.appendChild(mkDiffBtn('☠️ 启示录', 'apocalypse', '消耗×2.0·健康-50%·体温-40%·初始物资×0.3'));
        this.popupText.appendChild(row);
        this.popupText.appendChild(row2);
        this.popupDom.style.display = 'block';
        this.popupTimer = 0;
    }

    private setDifficulty(d: 'easy'|'normal'|'hard'){
        localStorage.setItem('frost_diff', d);
        this.game.difficulty = d;
        this.game.combat.diffMult = this.game.diffMult();
        this.showMsg(`难度已设为 ${d==='easy'?'🟢简单':d==='hard'?'🔴困难':'🟡普通'}（立即生效）`);
    }

    // ============================== 存档 ==============================
    private saveGame(){
        this.game.saveLocal({unlocked:[...this.unlocked]});
        this.showMsg('💾 已存档');
    }
    private loadGame(){
        const data = this.readLocalSaveData();
        if(!data) return;
        const err = this.game.load(JSON.stringify(data));
        if(err){ this.showMsg(err); return; }
        this.afterLoadSync(data);
        this.showMsg('📂 读档成功');
    }

    private readLocalSaveData(): any | null {
        const json = localStorage.getItem('frost_save');
        if(!json){ this.showMsg('无存档'); return null; }
        try {
            return JSON.parse(json);
        } catch(e) {
            this.showMsg('存档损坏，无法读取');
            return null;
        }
    }

    private afterLoadSync(data: any){
        this.unlocked = new Set(Array.isArray(data.unlocked) ? data.unlocked : []);
        this.game.setUnlockedBlueprints(this.unlocked);
        this.game.markSaveLoadVerified(true, {unlocked:[...this.unlocked]});
        (window as any).game = this.game;
        this.closeTransientUi();
    }

    // ============================== 键盘 ==============================
    private showHeatmap = false;
    private onKey(e: KeyboardEvent){
        if(e.key==='Escape'){
            if(this.pauseDom.style.display === 'flex'){ this.resumeGame(); return; }
            if(this.menuDom.style.display === 'flex' || this.storageDom.style.display === 'block' || this.charDom.style.display === 'block'){ this.closeMenu(); this.tool='view'; this.updateToolHint(); return; }
            this.showPauseMenu(); return;
        }
        if(e.key==='1'){ this.tool='view'; this.updateToolHint(); }
        if(e.key==='2'){ this.tool='wall'; this.updateToolHint(); }
        if(e.key==='3'){ this.tool='floor'; this.updateToolHint(); }
        if(e.key==='4'){ this.tool='pipe'; this.updateToolHint(); }
        if(e.key==='5'){ this.tool='rect'; this.updateToolHint(); }
        if(e.key==='h'){ this.showHeatmap=!this.showHeatmap; this.showMsg(this.showHeatmap?'🔥 热力图 ON':'热力图 OFF'); }
        if(e.key===' '){ e.preventDefault(); this.game.togglePause(); }
        if(e.key==='+' || e.key==='='){ e.preventDefault(); this.game.setSpeed(Math.min(3, (this.game.time.gameSpeed||1)+1)); }
        if(e.key==='-'){ e.preventDefault(); this.game.setSpeed(Math.max(1, (this.game.time.gameSpeed||1)-1)); }
        if(e.key==='0'){ e.preventDefault(); this.game.setSpeed(0); }
    }

    // ============================== 棋盘点击 ==============================
    private onCanvasClick(e: MouseEvent){
        const rect = this.canvasDom.getBoundingClientRect();
        const lx = e.clientX - rect.left;
        const ly = e.clientY - rect.top;
        const gx = Math.floor(lx / this.cellSize);
        const gy = this.mapSize - 1 - Math.floor(ly / this.cellSize);
        if(gx<0||gx>=this.mapSize||gy<0||gy>=this.mapSize) return;

        const realX = gx + 10;
        const realY = gy + 10;

        if(this.tool === 'view'){
            const c = this.game.baseGrid[realY][realX];
            const bm = this.game.build;
            const roomId = bm.getRoomId(realX, realY);
            let info = `(${realX},${realY}) ${c.temperature.toFixed(1)}°C ${c.building?.type||'空地'}`;
            if(roomId !== undefined){
                const room = bm.rooms.find(r=>r.id===roomId);
                if(room){
                    info += ` | 🏠#${roomId}(${room.cells.length}格)`;
                    if(room.pipeNetworkId !== undefined){
                        const net = bm.pipeNetworks.find(n=>n.id===room.pipeNetworkId);
                        if(net?.heatSource) info += ` 🔥${net.heatSource.type==='facility_coalstove'?'煤炉':'火堆'}`;
                    }
                }
            }
            this.showMsg(info);
        } else {
            if(this.tool === 'rect'){
                if(!this.rectStart){ this.rectStart = {x:realX, y:realY}; this.rectPreview = null; }
                else { this.game.wallRect(this.rectStart.x, this.rectStart.y, realX, realY); this.rectStart = null; this.rectPreview = null; }
            } else {
                // 设施工具直接映射，温室特判
                const facilityTools = ['coalstove','boiler','bed','workshop','lantern','radio','medical','kitchen','trap','geothermal','turret'];
                const basicTools: Record<string,string> = {pipe:'pipe',floor:'floor',door:'door',rwall:'rwall',window:'window',wall:'wall',uwall:'uwall'};
                if(this.tool==='greenhouse'){ this.game.buildGreenhouse(realX, realY); }
                else if(this.tool==='bury'){ this.game.buryCmd(realX, realY); }
                else if(facilityTools.includes(this.tool)){ this.game.buildCmd(this.tool, realX, realY); }
                else { this.game.buildCmd(basicTools[this.tool]||'wall', realX, realY); }
            }
        }
    }

    private hoverCell: {x:number;y:number}|null = null;
    private onCanvasMove(e: MouseEvent){
        const rb = this.canvasDom.getBoundingClientRect();
        const lx = e.clientX - rb.left;
        const ly = e.clientY - rb.top;
        const gx = Math.floor(lx / this.cellSize) + 10;
        const gy = this.mapSize - 1 - Math.floor(ly / this.cellSize) + 10;
        if(this.tool==='rect' && this.rectStart){ this.rectPreview={x:gx,y:gy}; }
        else if(this.tool!=='view'){ this.hoverCell={x:gx,y:gy}; }
        else { this.hoverCell=null; }
    }

    // ============================== 工具提示 ==============================
    private updateToolHint(){
        const names: Record<string,string> = {view:'🔍查看', wall:'🧱建墙', floor:'🪵地板', pipe:'🔧管道', rect:'📐矩形', door:'🚪木门', rwall:'🧱加固墙', window:'🪟窗户', coalstove:'🔥煤炉', boiler:'🏭锅炉', bed:'🛏床', workshop:'🔬工坊', lantern:'🪔油灯', greenhouse:'🌱温室', radio:'📡无线电', medical:'🏥医疗', kitchen:'🍳厨房', trap:'🪤陷阱', bury:'🪦埋葬', uwall:'🏗地下墙', geothermal:'🌋地热井', turret:'🔫炮塔'};
        // 材料需求
        const costs: Record<string,Record<string,number>> = {
            wall:{mat_wood:3}, floor:{mat_wood:1}, pipe:{mat_metal:1,mat_insulation:1}, rect:{mat_wood:3},
            door:{mat_wood:5,mat_metal:2}, rwall:{mat_wood:5,mat_metal:2}, window:{mat_glass:2,mat_wood:2},
            coalstove:{mat_metal:5}, boiler:{mat_metal:8,mat_insulation:5}, bed:{mat_insulation:3},
            workshop:{mat_metal:10,part_circuit:3}, lantern:{mat_metal:3}, greenhouse:{mat_wood:10,mat_glass:5,mat_soil:3},
            radio:{mat_metal:10,part_circuit:5}, medical:{mat_metal:5,mat_insulation:3}, kitchen:{mat_metal:3,mat_wood:2},
            trap:{mat_metal:3,mat_wood:4}, bury:{mat_wood:2},
            uwall:{mat_metal:4,mat_insulation:5},
            geothermal:{mat_metal:20,part_circuit:8},
            turret:{mat_metal:12,part_circuit:4},
        };
        const text = names[this.tool] || '';
        let costStr = '';
        const needs = costs[this.tool];
        if(needs){
            for(const [id,n] of Object.entries(needs)){
                const have = Math.round(this.game.inventory.get(id));
                costStr += ` ${this.itemName(id)}${have}/${n}`;
            }
        }
        this.toolDom.textContent = text ? `[${text}]${costStr}` : '选择工具 (1-5切换, Esc退出)';
    }

    // ============================== 主循环 ==============================
    update(dt: number){
        if(!this.game) return;
        this.enforceSingleHud();
        this.game.update(dt);

        // 搜刮场景刷新
        if(this.game.scavenge.active && this.scavOverlayDom.style.visibility==='visible'){
            this.scavRefreshTimer += dt;
            if(this.scavRefreshTimer >= 0.5){ this.scavRefreshTimer = 0; this.renderScavenge(); }
        }

        this.hudTimer += dt;
        if(this.hudTimer >= 0.5){
            this.hudTimer = 0;
            if(this.messageTimer > 0) this.messageTimer -= 0.5;
            if(this.messageDom){
                if(this.messageTimer > 0){
                    this.messageDom.textContent = `⚠ ${this.lastMessage}`;
                    this.messageDom.style.display = 'block';
                } else {
                    this.messageDom.style.display = 'none';
                }
            }
            const g = this.game;
            const isScavenging = g.scavenge.active || this.scavOverlayDom.style.visibility === 'visible';
            const t = g.baseGrid[25][25].temperature.toFixed(1);
            const bz = g.weather.state.isBlizzard?' 🌨':'';
            const dName = {easy:'🟢简单',normal:'🟡普通',hard:'🔴困难',nightmare:'💀噩梦',apocalypse:'☠️启示录'}[g.difficulty]||'';
            // 点击难度标签弹出选择器
            if(!(window as any)._diffClickBound){
                (window as any)._diffClickBound = true;
                this.hudDom.style.cursor = 'pointer';
                this.hudDom.addEventListener('click', (e: MouseEvent) => {
                    const target = e.target as HTMLElement;
                    if(target === this.hudDom || target.closest('.frozen-hud')){
                        this.showDifficultyPicker();
                    }
                });
            }
            let scavLine = '';
            if(g.scavenge.active){
                const pct = Math.min(100, Math.max(0, g.scavenge.timer/(g.scavenge.duration||5)*100));
                const filled = Math.min(10, Math.max(0, Math.floor(pct/10)));
                const bar = '█'.repeat(filled) + '░'.repeat(10-filled);
                scavLine = `\n🔍 搜刮: ${bar} ${pct.toFixed(0)}%`;
            }
            let radioLine = '';
            if(g.lastRadioResult && this.messageTimer <= 0){
                radioLine = `\n${g.lastRadioResult}`;
                g.lastRadioResult = '';
            }
            let enemyLine = '';
            if(g.combat.enemies.length > 0){
                const n: Record<string,string> = {frozen:'冻饿者',wolf:'变异狼',raider:'掠夺者',bear:'变异熊',scavenger:'拾荒者',bat:'变异蝙蝠',hound:'变异猎犬',behemoth:'🐋冰原巨兽'};
                const types = [...new Set(g.combat.enemies.map(e=>n[e.type]||e.type))];
                enemyLine = `\n⚠ ${types.join('/')} ×${g.combat.enemies.length}`;
            }
            // 数字格式化
            const fmt=(n:number)=>n>=1000?(n/1000).toFixed(1)+'k':Math.round(n).toString();

            // 燃料剩余天数
            const tf = g.inventory.totalFuel();
            let dailyUse = 0.3*24*g.weather.getFuelMultiplier()*g.diffMult()*100;
            if(g.baseGrid.some(r=>r.some(c=>c.building?.type==='facility_boiler'&&c.building?.built))){
                dailyUse = (0.25*300+0.08*100)/100*24*g.weather.getFuelMultiplier()*g.diffMult()*100;
            } else if(g.build.hasCoalStove()){
                dailyUse = (0.15*300+0.05*100)/100*24*g.weather.getFuelMultiplier()*g.diffMult()*100;
            }
            const fuelDays = dailyUse>0 ? (tf/(dailyUse||1)).toFixed(1) : '∞';

            const speedLabel = g.getSpeedLabel();
            const seasonLabel = g.weather.getSeasonLabel();
            const yearLabel = g.weather.getYear();
            const longTerm = g.getLongTermStatus();
            const completion = g.getCompletionStatus();
            const world = g.getWorldStatus();
            const prod = g.getProductionStatus();
            const nextGoal = longTerm.nextGoal ? longTerm.nextGoal.title : '长线完成';
            const longLine = `\n📜 Lv${longTerm.level} ${longTerm.name} | 下一步：${nextGoal}`;
            const nextV1 = completion.items.find(i=>!i.done);
            const v1Line = nextV1 ? `\n✅ v1 ${completion.score}% | ${nextV1.title}` : `\n✅ v1 ${completion.score}% | 可长测`;
            const worldLine = `\n🗺 世界Lv${world.level} 影响${world.influence} | ${prod.summary}`;
            let hudText =
                `第${g.time.day}天 | 第${yearLabel}年·${seasonLabel} (${g.weather.getSeasonDay()}/120) | ${dName} | ${speedLabel} | 室外${g.weather.state.outdoorTemp.toFixed(0)}°C${bz}\n`+
                `室内${t}°C | 食物${fmt(g.inventory.totalFood())} | 木${fmt(g.inventory.get('fuel_wood'))} 煤${fmt(g.inventory.get('fuel_coal'))}\n`+
                `建材 木${fmt(g.inventory.get('mat_wood'))} 金${fmt(g.inventory.get('mat_metal'))} | 🔥≈${fuelDays}天${longLine}${v1Line}${worldLine}${scavLine}${radioLine}${enemyLine}`;
            const wp = g.combat.equippedWeapon;
            const wpNames: Record<string,string> = {crowbar:'🪠撬棍+5',pistol:'🔫手枪+9',shotgun:'💥猎枪+17',rifle:'🔫步枪+12'};
            if(wp) hudText += `\n⚔ ${wpNames[wp]||wp}`;
            if(hudText !== this.lastHudText){
                this.lastHudText = hudText;
                this.hudBodyDom.textContent = hudText;
            }
            this.draw();
            this.updateCharPanel();

            // 仓储自动刷新
            if(this.storageDom.style.display === 'block') this.updateStorage();

            // 弹窗计时器
            if(this.popupTimer > 0){
                this.popupTimer -= 0.5;
                if(this.popupTimer <= 0) this.popupDom.style.display = 'none';
            }

            if(isScavenging){
                if(this.popupDom.style.display === 'block'){
                    this.popupDom.style.display = 'none';
                    this.popupTimer = 0;
                    this._evtShown = false;
                }
                return;
            }

            // 里程碑
            if(g.time.day===10 && !this._m10 && !g.pendingChoiceEvent && !this._evtShown){
                this.showPopup('🎉 第10天', '你还活着。建温室自给食物');
                this._m10 = true;
            }
            if(g.time.day===20 && !this._m20 && !g.pendingChoiceEvent && !this._evtShown){
                this.showPopup('🎉 第20天', '站稳脚跟。造雪地摩托探索医院');
                this._m20 = true;
            }

            // 燃料警告
            if(g.inventory.get('fuel_wood')<=0 && g.inventory.get('fuel_coal')<=0 && this.popupTimer<=0 && !g.pendingChoiceEvent && !this._evtShown){
                this.showPopup('⚠ 燃料耗尽！', '房间即将失温。立刻搜刮郊区');
            }

            // 幸存者对话气泡
            if(g.survivors.lastBark && this.messageTimer <= 0){
                this.showMsg(g.survivors.lastBark);
                g.survivors.lastBark = '';
            }
            // 建造消息
            if(g.lastBuildMsg){ this.showMsg(g.lastBuildMsg); g.lastBuildMsg = ''; }

            // 幸存者背景故事弹窗
            if(g.pendingStory && !this._evtShown && this.popupTimer<=0){
                const story = STORIES.find(s=>s.id===g.pendingStory.id);
                if(story){
                    this.showStoryPopup(story);
                    this.showMsg(`📖 ${story.author} 分享了回忆...`);
                }
                g.pendingStory = null;
            }

            // 新手引导弹窗
            if(g.pendingTutorial && !isScavenging && !this._evtShown && this.popupTimer<=0){
                this._evtShown = true;
                this.popupText.innerHTML = `<div style="color:var(--f-accent);font-size:16px;font-weight:bold;margin-bottom:8px">💡 新手引导</div><div style="color:var(--f-text);font-size:13px;line-height:1.7;text-align:left;white-space:pre-wrap;max-height:350px;overflow-y:auto;padding:8px;background:rgba(0,0,0,0.3);border-radius:8px;margin-bottom:10px">${g.pendingTutorial}</div>`;
                this.popupBtnA.style.display = 'inline-block';
                this.popupBtnA.textContent = '✓ 知道了';
                this.popupBtnA.onclick = () => { this._evtShown = false; this.popupDom.style.display = 'none'; };
                this.popupBtnB.style.display = 'none';
                this.popupDom.style.display = 'block';
                this.popupTimer = 0;
                g.pendingTutorial = null;
            }

            // 结局弹窗
            if(g.pendingEnding && !this._evtShown && this.popupTimer<=0){
                const e = g.pendingEnding;
                this._evtShown = true;
                this.popupText.innerHTML = `<div style="color:var(--f-accent);font-size:20px;font-weight:bold;margin-bottom:4px">${e.title}</div>`+
                    `<div style="color:var(--f-dim);font-size:13px;margin-bottom:12px">${e.subtitle}</div>`+
                    `<div style="color:var(--f-text);font-size:14px;line-height:1.8;text-align:left;white-space:pre-wrap;max-height:280px;overflow-y:auto;padding:14px;background:rgba(0,0,0,0.3);border-radius:8px;margin-bottom:12px">${e.story}</div>`;
                this.popupBtnA.style.display = 'inline-block';
                this.popupBtnA.textContent = '📊 统计';
                this.popupBtnA.onclick = () => { this.showEndingStats(e); };
                this.popupBtnB.style.display = 'inline-block';
                this.popupBtnB.textContent = '🏠 主菜单';
                this.popupBtnB.onclick = () => { this.popupDom.style.display = 'none'; this._evtShown = false; this.returnToTitle(); };
                this.popupDom.style.display = 'block';
                this.popupTimer = 0;
                g.pendingEnding = null;
            }

            // 事件弹窗
            const evt = g.pendingChoiceEvent;
            if(evt && !this._evtShown && this.popupTimer<=0){
                this.showChoicePopup(
                    evt.title, evt.msg,
                    evt.choiceA||'A', evt.choiceB||'B',
                    ()=>{ (this.game as any).resolveEventChoice('A'); this.showMsg(evt.effectA||'完成'); g.pendingChoiceEvent = null; },
                    ()=>{ (this.game as any).resolveEventChoice('B'); this.showMsg(evt.effectB||'已拒绝'); g.pendingChoiceEvent = null; }
                );
            }

            // 搜刮结算弹窗
            const loot = g.lastScavengeLoot;
            if(Object.keys(loot).length>0 && this.popupTimer<=0 && !g.pendingChoiceEvent && !this._evtShown && !g.scavenge.active){
                // 检查是否有故事物品
                const storyId = Object.keys(loot).find(id => id==='story_note' || id==='story_diary');
                if(storyId){
                    const story = getRandomStory();
                    this.showStoryPopup(story);
                } else if(loot._empty){
                    this.showPopup('📦 搜刮完成', '背包空空如也...下次加油！');
                } else {
                    const rc=['#90a890','#60b0f0','#f8c040'];
                    const entries=Object.entries(loot).sort((a,b)=>g.scavenge.itemRarity(b[0])-g.scavenge.itemRarity(a[0]));
                    const shown=entries.slice(0,8).map(([id,qty])=>`<span style="color:${rc[g.scavenge.itemRarity(id)]||'var(--f-text)'}">${this.itemName(id)} ×${qty}</span>`);
                    if(entries.length>8) shown.push('<span style="color:var(--f-dim);font-size:10px">...等</span>');
                    this.showPopup('📦 搜刮完成', shown.join('<br>'));
                }
                g.lastScavengeLoot = {};
            }
        }
    }

    // ============================== 绘制 ==============================
    private draw(){
        const ctx=this.ctx, cs=this.cellSize, grid=this.game.baseGrid;
        const scav = this.game.scavenge;
        ctx.clearRect(0, 0, this.mapSize*cs, this.mapSize*cs+20);

        // 搜刮进度条
        if(scav.active){
            const barW=this.mapSize*cs*0.6, barH=6;
            const barX=(this.mapSize*cs-barW)/2, barY=this.mapSize*cs+8;
            const pct=scav.timer/scav.duration;
            ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillRect(barX-2,barY-2,barW+4,barH+4);
            ctx.fillStyle='#2a5a3a'; ctx.fillRect(barX,barY,barW,barH);
            ctx.fillStyle=pct>0.8?'#f44':pct>0.5?'#fa4':'#4f4';
            ctx.fillRect(barX,barY,barW*pct,barH);
            ctx.fillStyle='#fff'; ctx.font='9px monospace';
            ctx.fillText(`🔍 ${scav.region}`,barX,barY-2);
        }

        // 棋盘
        const offset = 10;
        for(let y=0;y<this.mapSize;y++) for(let x=0;x<this.mapSize;x++){
            const c=grid[this.mapSize-1-y+offset][x+offset];
            if(!c) continue;
            const t=c.temperature;
            let r:number,g:number,b:number;
            if(c.building?.type==='wall_wood'){ r=100;g=70;b=50; }
            else if(c.building?.type==='wall_reinforced'){ r=80;g=80;b=100; }
            else if(c.building?.type==='door_wood'){ r=140;g=100;b=60; }
            else if(c.building?.type==='floor_wood'){ r=120;g=100;b=70; }
            else if(c.building?.type==='facility_firepit'||c.building?.type==='facility_coalstove'){ r=255;g=140;b=40; }
            else if(c.building?.type==='facility_boiler'){ r=255;g=100;b=30; }
            else if(c.building?.type==='facility_workshop'){ r=100;g=140;b=180; }
            else if(c.building?.type==='facility_radio'){ r=80;g=140;b=230; }
            else if(c.building?.type==='facility_greenhouse'){ r=60;g=200;b=100; }
            else if(c.building?.type==='facility_medical'){ r=230;g=100;b=160; }
            else if(c.building?.type==='facility_kitchen'){ r=250;g=160;b=60; }
            else if(c.building?.type==='light_lantern'){ r=255;g=220;b=100; }
            else if(c.building?.type==='window'){ r=130;g=200;b=230; }
            else if(c.building?.type==='facility_trap'){ r=200;g=60;b=40; }
            else if(c.building?.type==='pipe'){ r=150;g=150;b=200; }
            else if(c.building?.type==='bed_mattress'){ r=180;g=130;b=90; }
            else if(c.building?.type==='storage_shelf'){ r=160;g=140;b=120; }
            else if(c.building?.type==='wall_underground'){ r=60;g=80;b=100; }
            else if(c.building?.type==='facility_geothermal'){ r=255;g=50;b=20; }
            else if(c.building?.type==='defense_turret'){ r=200;g=150;b=60; }
            else if(c.building?.type==='grave'){ r=80;g=30;b=30; }
            else if(t>=0){ r=255;g=180;b=80; }
            else if(t>=-10){ r=140;g=180;b=220; }
            else if(t>=-20){ r=80;g=130;b=200; }
            else{ r=40;g=70;b=140; }
            ctx.fillStyle=`rgb(${r},${g},${b})`;
            ctx.fillRect(x*cs,y*cs,cs,cs);
        }
        // 热力图覆盖（H键切换）
        if(this.showHeatmap){
            for(let y=0;y<this.mapSize;y++) for(let x=0;x<this.mapSize;x++){
                const c=grid[this.mapSize-1-y+offset][x+offset];
                if(!c) continue;
                const t=c.temperature;
                const a=0.6;
                if(t>=0) ctx.fillStyle=`rgba(255,80,20,${a})`;
                else if(t>=-10) ctx.fillStyle=`rgba(255,160,40,${a})`;
                else if(t>=-20) ctx.fillStyle=`rgba(80,140,220,${a})`;
                else ctx.fillStyle=`rgba(30,60,160,${a})`;
                ctx.fillRect(x*cs,y*cs,cs,cs);
                // 温度数字
                ctx.fillStyle='#fff'; ctx.font='7px monospace'; ctx.textAlign='center';
                ctx.fillText(t.toFixed(0),x*cs+cs/2,y*cs+cs/2);
            }
        }
        // 网格线
        ctx.strokeStyle='rgba(255,255,255,0.12)';
        for(let i=0;i<=this.mapSize;i++){
            ctx.beginPath();ctx.moveTo(0,i*cs);ctx.lineTo(this.mapSize*cs,i*cs);ctx.stroke();
            ctx.beginPath();ctx.moveTo(i*cs,0);ctx.lineTo(i*cs,this.mapSize*cs);ctx.stroke();
        }
        // 敌人
        for(const e of this.game.combat.enemies){
            const ex=e.x-offset, ey=this.mapSize-1-(e.y-offset);
            if(ex<0||ex>=this.mapSize||ey<0||ey>=this.mapSize) continue;
            if(e.type==='bear') ctx.fillStyle='rgba(180,60,20,0.9)';
            else if(e.type==='behemoth') ctx.fillStyle='rgba(200,50,50,0.95)';
            else if(e.type==='hound') ctx.fillStyle='rgba(180,120,40,0.9)';
            else if(e.type==='bat') ctx.fillStyle='rgba(100,60,180,0.9)';
            else if(e.type==='scavenger') ctx.fillStyle='rgba(160,140,60,0.9)';
            else ctx.fillStyle=e.type==='frozen'?'rgba(220,60,40,0.9)':'rgba(240,90,50,0.9)';
            ctx.fillRect(ex*cs+1,ey*cs+1,cs-2,cs-2);
            const hp=e.hp/e.maxHp;
            ctx.fillStyle=hp>0.5?'#4f4':hp>0.25?'#ff4':'#f44';
            ctx.fillRect(ex*cs+1,ey*cs+1,(cs-2)*hp,2);
        }
        // 建造预览高亮
        if(this.hoverCell){
            const hx=this.hoverCell.x-offset, hy=this.mapSize-1-(this.hoverCell.y-offset);
            if(hx>=0&&hx<this.mapSize&&hy>=0&&hy<this.mapSize){
                ctx.fillStyle='rgba(255,255,100,0.35)';
                ctx.fillRect(hx*cs,hy*cs,cs,cs);
                ctx.strokeStyle='#ff0'; ctx.lineWidth=1.5;
                ctx.strokeRect(hx*cs+0.5,hy*cs+0.5,cs-1,cs-1);
            }
        }
        // 幸存者
        const alive2 = this.game.survivors.survivors.filter(s=>s.health>0);
        const workColors: Record<string,string> = {
            build:'#f8b040',heal:'#f06080',farm:'#60d080',guard:'#6080e0',
            rest:'#90a0b0',hunt:'#c08060',radio:'#60b0e0',
        };
        for(const s of alive2){
            const sx=s.position.x-offset, sy=this.mapSize-1-(s.position.y-offset);
            if(sx<0||sx>=this.mapSize||sy<0||sy>=this.mapSize) continue;
            const color = workColors[s.work]||'#ccc';
            ctx.fillStyle=color;
            ctx.beginPath();
            ctx.arc(sx*cs+cs/2,sy*cs+cs/2,cs/3,0,Math.PI*2);
            ctx.fill();
            ctx.strokeStyle='rgba(255,255,255,0.6)';
            ctx.lineWidth=1;
            ctx.stroke();
            ctx.fillStyle='#fff';
            ctx.font='8px monospace';
            ctx.textAlign='center';
            ctx.fillText(s.name[0],sx*cs+cs/2,sy*cs+cs/2+3);
        }
        // 矩形预览
        if(this.rectStart && this.rectPreview){
            const cs2 = this.cellSize;
            const x1 = this.rectStart.x - 10, y1 = this.mapSize - 1 - (this.rectStart.y - 10);
            const x2 = this.rectPreview.x - 10, y2 = this.mapSize - 1 - (this.rectPreview.y - 10);
            const rx = Math.min(x1, x2), ry = Math.min(y1, y2);
            const rw = Math.abs(x2 - x1) + 1, rh = Math.abs(y2 - y1) + 1;
            ctx.strokeStyle = 'rgba(255,200,50,0.8)';
            ctx.lineWidth = 2;
            ctx.strokeRect(rx*cs2, ry*cs2, rw*cs2, rh*cs2);
            ctx.fillStyle = 'rgba(255,200,50,0.15)';
            ctx.fillRect(rx*cs2, ry*cs2, rw*cs2, rh*cs2);
            ctx.lineWidth = 1;
        }
        // 暴风雪雾
        if(this.game.weather.state.isBlizzard){
            ctx.fillStyle = 'rgba(255,255,255,0.25)';
            ctx.fillRect(0, 0, this.mapSize * this.cellSize, this.mapSize * this.cellSize);
        }
        // 幸存者
        for(const s of this.game.survivors.survivors){
            const sx=s.position.x-offset, sy=this.mapSize-1-(s.position.y-offset);
            if(sx<0||sx>=this.mapSize||sy<0||sy>=this.mapSize) continue;
            ctx.fillStyle=s.health>50?'#4f4':s.health>20?'#ff4':'#f44';
            ctx.beginPath();ctx.arc(sx*cs+cs/2,sy*cs+cs/2,cs/3,0,Math.PI*2);ctx.fill();
            ctx.strokeStyle='#fff';ctx.lineWidth=1;ctx.stroke();
        }
    }

    // ============================== 辅助 ==============================
    private itemName(id:string):string{ return ITEM_INFO[id]?.name ?? id; }
    private itemDesc(id:string):string{ return ITEM_INFO[id]?.desc ?? ''; }

    onDestroy(){
        const els = [this.hudDom, this.messageDom, this.toolDom, this.menuDom, this.canvasDom, this.storageDom, this.charDom, this.popupDom, this.scavOverlayDom, this.barDom, document.getElementById('frozen-ui-styles')];
        for(const el of els) if(el && el.parentNode) el.parentNode.removeChild(el);
        if((window as any)._frozenGameManagerComp === this) (window as any)._frozenGameManagerComp = null;
    }
}
