import { BaseCell, BuildingType, WeatherState } from '../data/interfaces';

const HEAT_OUTPUT: Record<string,number> = { facility_firepit:5, facility_coalstove:15 };
const INSULATION_RATE: Record<string,number> = { wall_wood:0.4, floor_wood:0, pipe:0.25 };

export class TemperatureManager {
    private grid: BaseCell[][] = [];
    private width=0; private height=0;
    private outdoorTemp = -28;

    setGrid(g: BaseCell[][]) { this.grid=g; this.height=g.length; this.width=g[0]?.length??0; }
    setOutdoorTemp(t: number) { this.outdoorTemp=t; }

    tick(dt: number) {
        if(!this.grid.length) return;
        this.heatSources(dt); this.diffuse(dt); this.heatLoss(dt);
    }

    private heatSources(dt: number) {
        for(let y=0;y<this.height;y++) for(let x=0;x<this.width;x++){
            const c=this.grid[y][x];
            if(!c.building?.built) continue;
            const o=HEAT_OUTPUT[c.building.type];
            if(o) this.radiate(x,y,o*dt, c.building.type===BuildingType.FACILITY_FIREPIT?4:6);
        }
    }
    private radiate(cx:number,cy:number,a:number,r:number){
        for(let dy=-r;dy<=r;dy++) for(let dx=-r;dx<=r;dx++){
            const x=cx+dx,y=cy+dy;
            if(x<0||x>=this.width||y<0||y>=this.height) continue;
            const d=Math.sqrt(dx*dx+dy*dy); if(d>r) continue;
            this.grid[y][x].temperature+=a*(1-d/(r+1));
        }
    }
    private diffuse(dt: number){
        const N=this.height,M=this.width;
        const nT:number[][]=Array.from({length:N},()=>Array(M).fill(0));
        for(let y=0;y<N;y++) for(let x=0;x<M;x++){
            let s=0,cnt=0;
            for(const[dx,dy] of[[0,-1],[1,0],[0,1],[-1,0]]){
                const nx=x+dx,ny=y+dy;
                if(nx>=0&&nx<M&&ny>=0&&ny<N){s+=this.grid[ny][nx].temperature;cnt++;}
            }
            s+=this.grid[y][x].temperature;cnt++;
            const avg=s/cnt;
            nT[y][x]=this.grid[y][x].temperature+(avg-this.grid[y][x].temperature)*0.01*dt*60;
        }
        for(let y=0;y<N;y++) for(let x=0;x<M;x++) this.grid[y][x].temperature=nT[y][x];
    }
    private heatLoss(dt: number){
        const o=this.outdoorTemp;
        for(const row of this.grid) for(const c of row){
            let ins=0;
            if(c.building?.built) ins=INSULATION_RATE[c.building.type]??0;
            c.temperature-=(c.temperature-o)*(1-ins)*0.005*dt*60;
        }
    }

    getCellTemp(x:number,y:number):number {
        return this.grid[y]?.[x]?.temperature ?? this.outdoorTemp;
    }
}
