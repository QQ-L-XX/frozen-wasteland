import { _decorator, Component, Label, Node, Color, find, Graphics } from 'cc';
import { GameManager } from './core/GameManager';

const { ccclass } = _decorator;

@ccclass('GameManagerComp')
export class GameManagerComp extends Component {
    private game!: GameManager;
    private label!: Label;
    private gfx!: Graphics;
    private hudTimer=0;

    start(){
        // HUD
        const canvas = find('Canvas', this.node.scene);
        const parent = canvas ?? this.node;
        const labelNode = new Node('HUD');
        labelNode.setPosition(0,300,0);
        this.label = labelNode.addComponent(Label);
        this.label.fontSize=20; this.label.lineHeight=28;
        this.label.color=new Color(220,240,255,255);
        parent.addChild(labelNode);

        // 热力图
        const gfxNode = new Node('Heatmap');
        gfxNode.setPosition(-480,-200,0);
        this.gfx = gfxNode.addComponent(Graphics);
        parent.addChild(gfxNode);

        this.game = new GameManager();
        (window as any).game = this.game;

        console.log('═══════════════════════════════════');
        console.log('  极寒末世 · v1.0-alpha');
        console.log('═══════════════════════════════════');
        console.log('📟 game.wall(x,y) | game.plan(...) | game.scavengeCmd()');
        console.log('   game.heatmap() | game.status() | game.spawnCmd()');
        console.log('   game.buildVehicle("sled") | game.buildGreenhouse(x,y)');
        console.log('═══════════════════════════════════');
    }

    update(dt:number){
        if(!this.game) return;
        this.game.update(dt);

        this.hudTimer+=dt;
        if(this.hudTimer>=0.5){
            this.hudTimer=0;
            const g=this.game;
            const t=g.baseGrid[25][25].temperature.toFixed(1);
            const bz=g.weather.state.isBlizzard?' 🌨':'';
            this.label.string=
                `Day ${g.time.day}  |  室外 ${g.weather.state.outdoorTemp.toFixed(0)}°C${bz}\n`+
                `室内中心 ${t}°C\n`+
                `食物 ${g.inventory.totalFood()}  木 ${g.inventory.get('fuel_wood')}  煤 ${g.inventory.get('fuel_coal')}`;
            this.drawHeatmap();
        }
    }

    private drawHeatmap(){
        this.gfx.clear();
        const cs=6, grid=this.game.baseGrid;
        const cx=22,cy=22,w=16;
        for(let dy=0;dy<w;dy++) for(let dx=0;dx<w;dx++){
            const x=cx+dx,y=cy+dy;
            if(y>=grid.length||x>=grid[0].length) continue;
            const c=grid[y][x]; const t=c.temperature;
            let r:number, g:number, b:number;
            if(c.building?.type==='wall_wood'){ r=100;g=70;b=50; }
            else if(c.building?.type==='facility_firepit'||c.building?.type==='facility_coalstove'){ r=255;g=140;b=40; }
            else if(c.building?.type==='pipe'){ r=150;g=150;b=200; }
            else if(t>=0){ r=255;g=180;b=80; }
            else if(t>=-10){ r=140;g=180;b=220; }
            else if(t>=-20){ r=80;g=130;b=200; }
            else{ r=40;g=70;b=140; }
            this.gfx.fillColor=new Color(r,g,b,255);
            this.gfx.rect(dx*cs,dy*cs,cs,cs);
            this.gfx.fill();
        }
    }
}
