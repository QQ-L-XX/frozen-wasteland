import { _decorator, Component } from 'cc';
import { GameManager } from './core/GameManager';

const { ccclass } = _decorator;

@ccclass('GameManagerComp')
export class GameManagerComp extends Component {
    private game!: GameManager;
    private hudTimer=0;
    private cellSize=12; private mapSize=30; // 缩小棋盘，聚焦核心
    private tool='view';
    private hudDom!: HTMLDivElement;
    private toolDom!: HTMLDivElement;
    private canvasDom!: HTMLCanvasElement;
    private ctx!: CanvasRenderingContext2D;
    private menuDom!: HTMLDivElement;
    private storageDom!: HTMLDivElement;
    private popupDom!: HTMLDivElement;
    private popupTimer = 0;
    private rectStart: {x:number,y:number}|null = null; // 矩形起点
    private rectPreview: {x:number,y:number}|null = null; // 矩形预览

    start(){
        // HUD
        this.hudDom = document.createElement('div');
        this.hudDom.style.cssText = 'position:fixed;top:10px;left:10px;color:#ddeeff;font:16px monospace;z-index:999;background:rgba(0,0,0,0.8);padding:6px 10px;border-radius:4px;white-space:pre-line;line-height:1.4';
        document.body.appendChild(this.hudDom);

        this.toolDom = document.createElement('div');
        this.toolDom.style.cssText = 'position:fixed;bottom:50px;left:50%;transform:translateX(-50%);color:#ffcc44;font:14px monospace;z-index:999;background:rgba(0,0,0,0.7);padding:3px 8px;border-radius:4px';
        document.body.appendChild(this.toolDom);
        this.updateToolHint();

        // 弹出菜单
        this.menuDom = document.createElement('div');
        this.menuDom.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);z-index:1000;display:none;flex-wrap:wrap;gap:4px;justify-content:center';
        document.body.appendChild(this.menuDom);

        // 仓储面板
        this.storageDom = document.createElement('div');
        this.storageDom.style.cssText = 'position:fixed;top:50%;right:20px;transform:translateY(-50%);z-index:1000;display:none;flex-direction:column;gap:2px;background:rgba(0,0,0,0.85);border:1px solid #556;border-radius:6px;padding:12px;font:13px monospace;color:#ddeeff;min-width:200px;max-height:400px;overflow-y:auto';
        document.body.appendChild(this.storageDom);

        // 人物状态面板（左侧常驻）
        const charDom = document.createElement('div');
        charDom.id = 'charPanel';
        charDom.style.cssText = 'position:fixed;top:50%;left:20px;transform:translateY(-50%);z-index:999;background:rgba(0,0,0,0.8);border:1px solid #556;border-radius:6px;padding:10px;font:12px monospace;color:#ddeeff;min-width:160px';
        document.body.appendChild(charDom);

        // 弹窗
        this.popupDom = document.createElement('div');
        this.popupDom.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:1001;display:none;background:rgba(0,0,0,0.9);border:2px solid #ffcc44;border-radius:8px;padding:16px;font:14px monospace;color:#fff;text-align:center;min-width:240px';
        document.body.appendChild(this.popupDom);

        // 热力图 Canvas (30×30, 居中)
        const px = this.cellSize * this.mapSize;
        this.canvasDom = document.createElement('canvas');
        this.canvasDom.width = px; this.canvasDom.height = px;
        this.canvasDom.style.cssText = `position:fixed;top:50%;left:50%;margin-top:-${px/2}px;margin-left:-${px/2}px;z-index:10;border:1px solid #444;cursor:crosshair`;
        this.canvasDom.addEventListener('click', (e) => this.onCanvasClick(e));
        this.canvasDom.addEventListener('mousemove', (e) => this.onCanvasMove(e));
        document.body.appendChild(this.canvasDom);
        this.ctx = this.canvasDom.getContext('2d')!;

        this.game = new GameManager();
        (window as any).game = this.game;

        // 底部 4 个主按钮
        this.createButtons();
        document.addEventListener('keydown', (e) => this.onKey(e));
    }

    private createButtons(){
        const bar = document.createElement('div');
        bar.style.cssText = 'position:fixed;bottom:10px;left:50%;transform:translateX(-50%);z-index:999;display:flex;gap:10px';
        const mainBtns = [
            ['🔨 建造', ()=>this.showMenu('build')],
            ['📦 搜刮', ()=>this.showMenu('scavenge')],
            ['🏠 基地', ()=>this.showMenu('base')],
            ['📋 仓储', ()=>this.toggleStorage()],
        ];
        for(const [label,fn] of mainBtns){
            const btn = document.createElement('button');
            btn.textContent = label;
            btn.style.cssText = 'background:#3a4a5a;color:#fff;border:1px solid #667;padding:8px 18px;border-radius:6px;cursor:pointer;font-size:15px;font-weight:bold';
            btn.addEventListener('click', fn);
            bar.appendChild(btn);
        }
        document.body.appendChild(bar);
    }

    private messageTimer = 0;
    private lastMessage = '';
    private menuOpen = false;

    showMsg(msg: string){ this.lastMessage = msg; this.messageTimer = 3; }
    private showMenu(type: string){
        if(this.menuOpen && (this as any)._menuType === type){ this.closeMenu(); return; }
        this.closeMenu();
        (this as any)._menuType = type;
        this.menuOpen = true;
        this.menuDom.style.display = 'flex';
        this.menuDom.innerHTML = '';

        let items: [string,()=>void][] = [];
        if(type==='build'){
            items = [
                ['🧱 墙', ()=>{ this.tool='wall'; this.updateToolHint(); this.closeMenu(); }],
                ['🪵 地板', ()=>{ this.tool='floor'; this.updateToolHint(); this.closeMenu(); }],
                ['🔧 管道', ()=>{ this.tool='pipe'; this.updateToolHint(); this.closeMenu(); }],
                ['🔥 煤炉', ()=>{ this.game.buildCmd('coalstove',26,25); this.closeMenu(); }],
                ['🛏 床', ()=>{ this.game.buildCmd('bed',26,27); this.closeMenu(); }],
                ['📐 矩形', ()=>{ this.tool='rect'; this.updateToolHint(); this.closeMenu(); }],
            ];
        }else if(type==='scavenge'){
            this.showMap();
            return;
        }else if(type==='base'){
            const g = this.game;
            items = [
                ['🛷 雪橇', ()=>{
                    if(!g.inventory.has('mat_wood',8)){ this.showMsg('需要 木材×8'); return; }
                    if(!g.inventory.has('mat_metal',4)){ this.showMsg('需要 金属×4'); return; }
                    g.buildVehicle('sled');
                    this.showMsg('🛷 雪橇完成！可去商业街');
                }],
                ['🏍 雪地摩托', ()=>{
                    if(!g.inventory.has('mat_metal',15)){ this.showMsg('需要 金属×15'); return; }
                    if(!g.inventory.has('part_circuit',5)){ this.showMsg('需要 电路板×5'); return; }
                    if(!g.inventory.has('part_motor',1)){ this.showMsg('需要 马达×1'); return; }
                    g.buildVehicle('snowmobile');
                    this.showMsg('🏍 雪地摩托完成！可去医院');
                }],
                ['🌱 温室', ()=>{
                    if(!g.inventory.has('mat_wood',10)){ this.showMsg('需要 木材×10'); return; }
                    if(!g.inventory.has('mat_glass',5)){ this.showMsg('需要 玻璃×5'); return; }
                    if(!g.inventory.has('mat_soil',3)){ this.showMsg('需要 土壤×3'); return; }
                    g.buildGreenhouse(20,20);
                    this.showMsg('🌱 温室完成！');
                }],
                ['🌾 种植', ()=>{
                    const err = g.greenhouse.plant(g.baseGrid);
                    if(err) this.showMsg(err);
                    else this.showMsg('🌱 已种植 5天后收获');
                }],
                ['📊 状态', ()=>{
                    const msg = `Day${g.time.day} 食物${g.inventory.totalFood()} 木${g.inventory.get('fuel_wood')} 煤${g.inventory.get('fuel_coal')} 建材木${g.inventory.get('mat_wood')} 金${g.inventory.get('mat_metal')}`;
                    this.showMsg(msg);
                }],
            ];
        }

        for(const [label,fn] of items){
            const btn = document.createElement('button');
            btn.textContent = label;
            btn.style.cssText = 'background:#2a3a4a;color:#ddeeff;border:1px solid #556;padding:6px 14px;border-radius:4px;cursor:pointer;font-size:13px';
            btn.addEventListener('click', fn);
            this.menuDom.appendChild(btn);
        }
    }

    private closeMenu(){ this.menuDom.style.display='none'; this.menuOpen=false; }

    private showMap(){
        this.closeMenu();
        const g = this.game;
        const regions = [
            {id:'suburb',name:'郊区住宅',x:150,y:160,fuel:1,color:'#4a4'},
            {id:'commercial',name:'商业街',x:100,y:80,fuel:3,color:'#fa4'},
            {id:'hospital',name:'医院',x:250,y:100,fuel:3,color:'#f44'},
        ];

        let html = '<div style="font-size:16px;font-weight:bold;color:#ffcc44;margin-bottom:8px">🗺 世界地图</div>';
        // 用绝对定位的 div 模拟地图
        html += '<div style="position:relative;width:300px;height:220px;background:#1a2a3a;border:1px solid #445;border-radius:4px;margin:0 auto">';
        // 基地
        html += '<div style="position:absolute;left:145px;top:170px;color:#fff;font-size:18px" title="基地">🏠</div>';
        html += '<div style="position:absolute;left:155px;top:172px;color:#888;font-size:10px">基地</div>';

        for(const r of regions){
            const dep = g.scavenge.getDepletion(r.id);
            const locked = !g.vehicle.hasUnlock(r.id);
            const barW = 40;
            const filled = Math.round((1-dep/100)*barW);
            const depColor = dep>80?'#f44':dep>50?'#fa4':'#4f4';
            html += `<div style="position:absolute;left:${r.x}px;top:${r.y}px;color:${locked?'#555':r.color};font-size:16px;cursor:${locked?'not-allowed':'pointer'}"
                onclick="window._scavengeMap('${r.id}')" title="${r.name}">📍</div>`;
            html += `<div style="position:absolute;left:${r.x-15}px;top:${r.y+18}px;color:#ddeeff;font-size:10px">${r.name}</div>`;
            // 枯竭度条
            html += `<div style="position:absolute;left:${r.x-22}px;top:${r.y+30}px;width:${barW}px;height:4px;background:#333;border-radius:2px">
                <div style="width:${filled}px;height:4px;background:${depColor};border-radius:2px"></div></div>`;
            if(locked) html += `<div style="position:absolute;left:${r.x-15}px;top:${r.y+36}px;color:#f44;font-size:9px">🔒需载具</div>`;
        }
        html += '</div>';
        html += '<div style="margin-top:6px;font-size:11px;color:#888">点击📍出发 | 绿色条=物资剩余 | 红条=枯竭</div>';

        this.menuDom.innerHTML = html;
        this.menuDom.style.display = 'flex';
        this.menuOpen = true;
        (this as any)._menuType = 'scavenge';

        // 点击回调
        (window as any)._scavengeMap = (region: string) => {
            if(g.scavenge.active){ this.showMsg('已有探索队在外'); return; }
            if(!g.vehicle.hasUnlock(region)){ this.showMsg('需要载具'); return; }
            if(g.scavenge.getDepletion(region) >= 90){ this.showMsg('已枯竭'); return; }
            if(!g.inventory.has('fuel_wood', g.scavenge.getRegion(region)?.fuel||0)){ this.showMsg('燃料不足'); return; }
            g.scavengeCmd(region);
            this.closeMenu();
        };
    }

    private toggleStorage(){
        const panel = this.storageDom;
        if(panel.style.display === 'flex'){
            panel.style.display = 'none'; return;
        }
        panel.style.display = 'flex';
        this.updateStorage();
    }

    private updateStorage(){
        const panel = this.storageDom;
        const inv = this.game.inventory;
        const cats: [string,string[]][] = [
            ['🍖 食物', ['food_can','food_bread','food_meat_frozen','food_veg','food_soup']],
            ['⛽ 燃料', ['fuel_wood','fuel_coal','fuel_propane','fuel_oil']],
            ['🪵 建材', ['mat_wood','mat_metal','mat_insulation','mat_glass','mat_soil','mat_stone']],
            ['💊 药品', ['med_bandage','med_antibiotic','med_frostbite','med_firstaid','med_herb']],
            ['🔌 零件', ['part_circuit','part_battery','part_wire','part_motor','part_chip']],
        ];
        let html = '<div style="font-weight:bold;margin-bottom:6px">📋 仓 储</div>';
        for(const [cat, ids] of cats){
            const items = ids.filter(id=>inv.get(id)>0);
            if(items.length === 0) continue;
            html += `<div style="color:#ffcc44;margin-top:4px">${cat}</div>`;
            for(const id of items) html += `<div style="padding-left:12px">${id} ×${inv.get(id)}</div>`;
        }
        if(!html.includes('padding-left')){
            html += '<div style="color:#888">仓库是空的</div>';
        }
        panel.innerHTML = html;
    }

    private updateToolHint(){
        const names: Record<string,string> = {view:'🔍', wall:'🧱 建墙', floor:'🪵 地板', pipe:'🔧 管道', rect:'📐 矩形'};
        const text = names[this.tool] || '';
        this.toolDom.textContent = text ? `[${text}] 点击棋盘 | Esc 退出` : '选择工具后点击棋盘';
    }

    private onCanvasClick(e: MouseEvent){
        const rect = this.canvasDom.getBoundingClientRect();
        const lx = e.clientX - rect.left;
        const ly = e.clientY - rect.top;
        const gx = Math.floor(lx / this.cellSize);
        const gy = this.mapSize - 1 - Math.floor(ly / this.cellSize);
        if(gx<0||gx>=this.mapSize||gy<0||gy>=this.mapSize) return;

        // 棋盘对应 50×50 的中心 30×30 区域，偏移 (10,10)
        const realX = gx + 10;
        const realY = gy + 10;

        if(this.tool === 'view'){
            const c = this.game.baseGrid[realY][realX];
            console.log(`(${realX},${realY}) ${c.temperature.toFixed(1)}°C ${c.building?.type||'空地'}`);
        }else if(this.tool === 'rect'){
            if(!this.rectStart){
                this.rectStart = {x:realX, y:realY};
                this.rectPreview = null;
                console.log(`矩形起点: (${realX},${realY})，再点终点`);
            } else {
                this.game.wallRect(this.rectStart.x, this.rectStart.y, realX, realY);
                this.rectStart = null; this.rectPreview = null;
                this.tool = 'view'; this.updateToolHint(); this.closeMenu();
            }
            return;
        }else{
            const type = this.tool==='pipe'?'pipe':this.tool==='floor'?'floor':'wall';
            this.game.buildCmd(type, realX, realY);
        }
        // 保持工具模式，不退出。Esc 退出。
        this.updateToolHint();
    }

    private onCanvasMove(e: MouseEvent){
        if(this.tool !== 'rect' || !this.rectStart) return;
        const rect = this.canvasDom.getBoundingClientRect();
        const lx = e.clientX - rect.left;
        const ly = e.clientY - rect.top;
        const gx = Math.floor(lx / this.cellSize) + 10;
        const gy = this.mapSize - 1 - Math.floor(ly / this.cellSize) + 10;
        this.rectPreview = {x:gx, y:gy};
    }

    private onKey(e: KeyboardEvent){
        const k = e.key;
        if(k==='1'||k==='q'){ this.tool='view'; this.updateToolHint(); }
        if(k==='2'||k==='w'){ this.tool='wall'; this.updateToolHint(); }
        if(k==='3'||k==='e'){ this.tool='floor'; this.updateToolHint(); }
        if(k==='4'||k==='r'){ this.tool='pipe'; this.updateToolHint(); }
        if(k==='5') this.game.scavengeCmd('suburb');
        if(k==='6') this.game.scavengeCmd('commercial');
        if(k==='7') this.game.scavengeCmd('hospital');
        if(k===' ') this.game.status();
        if(k==='g') this.game.addFuel(10);
        if(k==='h') this.game.addMat('mat_wood',10);
        if(k==='Escape'){ this.menuDom.style.display='none'; this.tool='view'; this.updateToolHint(); }
    }

    update(dt:number){
        if(!this.game) return;
        this.game.update(dt);
        this.hudTimer+=dt;
        if(this.hudTimer>=0.5){
            this.hudTimer=0;
            // 消息计时
            if(this.messageTimer > 0) this.messageTimer -= 0.5;
            const msg = this.messageTimer > 0 ? `\n⚠ ${this.lastMessage}` : '';
            const g=this.game;
            const t=g.baseGrid[25][25].temperature.toFixed(1);
            const bz=g.weather.state.isBlizzard?' 🌨':'';
            // 搜刮进度 / 结果
            let scavLine = '';
            if(g.scavenge.active){
                const pct = (g.scavenge.timer / g.scavenge.duration * 100).toFixed(0);
                const bar = '█'.repeat(Math.floor(Number(pct)/10)) + '░'.repeat(10-Math.floor(Number(pct)/10));
                scavLine = `\n🔍 搜刮: ${bar} ${pct}%`;
            } else if(Object.keys(g.lastScavengeLoot).length > 0){
                const items = Object.entries(g.lastScavengeLoot).slice(0,4).map(([id,qty])=>`${id}×${qty}`).join(' ');
                scavLine = `\n📦 获得: ${items}`;
            }
            this.hudDom.textContent =
                `Day ${g.time.day}  |  室外 ${g.weather.state.outdoorTemp.toFixed(0)}°C${bz}\n`+
                `室内 ${t}°C | 食物 ${g.inventory.totalFood()} | 燃料 木${g.inventory.get('fuel_wood')} 煤${g.inventory.get('fuel_coal')}\n`+
                `建材 木${g.inventory.get('mat_wood')} 金${g.inventory.get('mat_metal')}${scavLine}${msg}`;
            this.draw();
            this.updateCharPanel();
            if(this.storageDom.style.display === 'flex') this.updateStorage();

            // 弹窗计时
            if(this.popupTimer > 0){
                this.popupTimer -= 0.5;
                if(this.popupTimer <= 0) this.popupDom.style.display = 'none';
            }
        }
        // 里程碑
        if(this.game.time.day === 10 && this.popupTimer <= 0 && !(this as any)._m10){
            this.popupDom.innerHTML = '<div style="font-size:18px;color:#ffcc44">🎉 第10天</div>你还活着。<br>接下来的目标：<br>建温室自给食物';
            this.popupDom.style.display = 'block'; this.popupTimer = 5;
            (this as any)._m10 = true;
        }
        if(this.game.time.day === 20 && this.popupTimer <= 0 && !(this as any)._m20){
            this.popupDom.innerHTML = '<div style="font-size:18px;color:#ffcc44">🎉 第20天</div>你已经站稳了脚跟。<br>目标：造雪地摩托探索医院';
            this.popupDom.style.display = 'block'; this.popupTimer = 5;
            (this as any)._m20 = true;
        }
        // 燃料耗尽警告
        if(this.game.inventory.get('fuel_wood') <= 0 && this.game.inventory.get('fuel_coal') <= 0 && this.popupTimer <= 0){
            this.popupDom.innerHTML = '<div style="font-size:18px;color:#f44;margin-bottom:8px">⚠ 燃料耗尽！</div>房间即将失温<br>立刻搜刮郊区获取木材';
            this.popupDom.style.display = 'block';
            this.popupTimer = 6;
        }
        // 搜刮完成弹窗
        const loot = this.game.lastScavengeLoot;
        if(Object.keys(loot).length > 0 && this.popupTimer <= 0){
            const items = Object.entries(loot).slice(0,6).map(([id,qty])=>`${id} ×${qty}`).join('<br>');
            this.popupDom.innerHTML = `<div style="font-size:16px;color:#ffcc44;margin-bottom:8px">📦 搜刮完成</div>${items}`;
            this.popupDom.style.display = 'block';
            this.popupTimer = 4;
            // 清掉 loot 避免重复弹
            this.game.lastScavengeLoot = {};
        }
    }

    private updateCharPanel(){
        const panel = document.getElementById('charPanel');
        if(!panel) return;
        let html = '<div style="font-weight:bold;margin-bottom:4px">👥 幸存者</div>';
        for(const s of this.game.survivors.survivors){
            const bar = (v:number,c:string) => {
                const w = 10;
                const filled = Math.round(v/100*w);
                return `<span style="color:${c}">${'█'.repeat(filled)}${'░'.repeat(w-filled)}</span> ${v}%`;
            };
            html += `<div style="margin-top:3px;padding:2px 0;border-top:1px solid #333">
                <span style="color:#fff">${s.name}</span>
                <div>❤ ${bar(s.health,'#4f4')}</div>
                <div>🌡 ${bar(s.bodyTemp,'#4cf')}</div>
                <div>😊 ${bar(s.morale,'#fc4')}</div>
            </div>`;
        }
        panel.innerHTML = html;
    }

    private draw(){
        const ctx=this.ctx, cs=this.cellSize, grid=this.game.baseGrid;
        const scav = this.game.scavenge;

        // 绘制棋盘 (baseGrid 50×50 → 显示中心 30×30)
        const offset = 10;
        for(let y=0;y<this.mapSize;y++) for(let x=0;x<this.mapSize;x++){
            const c=grid[this.mapSize-1-y+offset][x+offset];
            if(!c) continue;
            const t=c.temperature;
            let r:number,g:number,b:number;
            if(c.building?.type==='wall_wood'){ r=100;g=70;b=50; }
            else if(c.building?.type==='floor_wood'){ r=120;g=100;b=70; }
            else if(c.building?.type==='facility_firepit'||c.building?.type==='facility_coalstove'){ r=255;g=140;b=40; }
            else if(c.building?.type==='pipe'){ r=150;g=150;b=200; }
            else if(t>=0){ r=255;g=180;b=80; }
            else if(t>=-10){ r=140;g=180;b=220; }
            else if(t>=-20){ r=80;g=130;b=200; }
            else{ r=40;g=70;b=140; }
            ctx.fillStyle=`rgb(${r},${g},${b})`;
            ctx.fillRect(x*cs,y*cs,cs,cs);
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
            ctx.fillStyle=e.type==='frozen'?'rgba(220,60,40,0.9)':'rgba(240,90,50,0.9)';
            ctx.fillRect(ex*cs+1,ey*cs+1,cs-2,cs-2);
            const hp=e.hp/e.maxHp;
            ctx.fillStyle=hp>0.5?'#4f4':hp>0.25?'#ff4':'#f44';
            ctx.fillRect(ex*cs+1,ey*cs+1,(cs-2)*hp,2);
        }
        // 矩形预览
        if(this.rectStart && this.rectPreview){
            const x1 = this.rectStart.x-10, y1 = this.mapSize-1-(this.rectStart.y-10);
            const x2 = this.rectPreview.x-10, y2 = this.mapSize-1-(this.rectPreview.y-10);
            const rx = Math.min(x1,x2), ry = Math.min(y1,y2);
            const rw = Math.abs(x2-x1)+1, rh = Math.abs(y2-y1)+1;
            ctx.strokeStyle = 'rgba(255,200,50,0.7)';
            ctx.lineWidth = 2;
            ctx.strokeRect(rx*cs, ry*cs, rw*cs, rh*cs);
            ctx.fillStyle = 'rgba(255,200,50,0.15)';
            ctx.fillRect(rx*cs, ry*cs, rw*cs, rh*cs);
        }

        // 暴风雪白雾
        if(this.game.weather.state.isBlizzard){
            ctx.fillStyle = 'rgba(255,255,255,0.25)';
            ctx.fillRect(0, 0, this.mapSize*cs, this.mapSize*cs);
            // 雪花粒子
            ctx.fillStyle = 'rgba(255,255,255,0.6)';
            const seed = Date.now()/1000;
            for(let i=0;i<40;i++){
                const sx = ((seed*137+i*73)%1000)/1000*this.mapSize*cs;
                const sy = ((seed*251+i*47)%1000)/1000*this.mapSize*cs;
                ctx.fillRect(sx, sy, 2, 2);
            }
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

    onDestroy(){
        if(this.hudDom) document.body.removeChild(this.hudDom);
        if(this.toolDom) document.body.removeChild(this.toolDom);
        if(this.menuDom) document.body.removeChild(this.menuDom);
        if(this.storageDom) document.body.removeChild(this.storageDom);
        if(this.popupDom) document.body.removeChild(this.popupDom);
        if(this.canvasDom) document.body.removeChild(this.canvasDom);
    }
}
