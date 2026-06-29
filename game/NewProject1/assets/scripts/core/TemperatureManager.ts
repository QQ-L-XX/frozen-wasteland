import { BaseCell, BuildingType, WeatherState, PipeNetwork, Room } from '../data/interfaces';

const HEAT_OUTPUT: Record<string,number> = { facility_firepit:5, facility_coalstove:15, facility_boiler:25, facility_geothermal:80 };
const INSULATION_RATE: Record<string,number> = { wall_wood:0.4, wall_reinforced:0.7, door_wood:0.3, floor_wood:0, pipe:0.25 };

export class TemperatureManager {
    private grid: BaseCell[][] = [];
    private width=0; private height=0;
    private outdoorTemp = -28;

    setGrid(g: BaseCell[][]) { this.grid=g; this.height=g.length; this.width=g[0]?.length??0; }
    setOutdoorTemp(t: number) { this.outdoorTemp=t; }

    tick(dt: number, networks?: PipeNetwork[], rooms?: Room[], hasFuel?: boolean) {
        if(!this.grid.length) return;
        this.heatSources(dt, hasFuel);
        if(networks) for(let i=0;i<3;i++) this.pipeNetwork(dt, networks, rooms);
        else for(let i=0;i<3;i++) this.pipeNetwork(dt);
        this.diffuse(dt);
        this.heatLoss(dt);
    }

    private heatSources(dt: number, hasFuel?: boolean) {
        for(let y=0;y<this.height;y++) for(let x=0;x<this.width;x++){
            const c=this.grid[y][x];
            if(!c.building?.built) continue;
            const o=HEAT_OUTPUT[c.building.type];
            // 地热井永远免费供暖，不受燃料限制
            const isGeothermal = c.building.type===BuildingType.FACILITY_GEOTHERMAL;
            // 无燃料时普通热源失效
            const actual = (!isGeothermal && hasFuel===false && (c.building.type===BuildingType.FACILITY_FIREPIT||c.building.type===BuildingType.FACILITY_COALSTOVE||c.building.type===BuildingType.FACILITY_BOILER)) ? 0 : o;
            if(actual) this.radiate(x,y,actual*dt, isGeothermal?12:c.building.type===BuildingType.FACILITY_FIREPIT?4:c.building.type===BuildingType.FACILITY_BOILER?8:6);
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

    /** 管道网络传热：利用连通性数据精准传热 */
    private pipeNetwork(dt: number, networks?: PipeNetwork[], rooms?: Room[]){
        if(!networks || networks.length===0){
            // 降级：旧版扫描式传热
            this.pipeNetworkLegacy(dt);
            return;
        }
        // 管道自身升温
        for(const net of networks){
            if(!net.heatSource) continue;
            const output = net.heatSource.type===BuildingType.FACILITY_BOILER ? 12 : net.heatSource.type===BuildingType.FACILITY_COALSTOVE ? 8 : 3;
            const eff = Math.max(0.3, 1 - net.pipes.length * 0.015);
            const heatGain = output * eff * dt;
            for(const p of net.pipes){
                this.grid[p.y][p.x].temperature = Math.min(
                    this.outdoorTemp + 35,
                    this.grid[p.y][p.x].temperature + heatGain
                );
            }
        }
        // 管道加热相邻房间
        if(rooms) for(const net of networks){
            if(!net.heatSource || net.connectedRooms.length===0) continue;
            const output = net.heatSource.type===BuildingType.FACILITY_BOILER ? 6 : net.heatSource.type===BuildingType.FACILITY_COALSTOVE ? 4 : 1.5;
            const eff = Math.max(0.3, 1 - net.pipes.length * 0.015);
            const roomHeat = output * eff * dt;
            for(const roomId of net.connectedRooms){
                const room = rooms.find(r=>r.id===roomId);
                if(!room) continue;
                for(const c of room.cells){
                    this.grid[c.y][c.x].temperature = Math.min(
                        this.outdoorTemp + 30,
                        this.grid[c.y][c.x].temperature + roomHeat
                    );
                }
            }
        }
    }

    /** 旧版管道传热（无连通性数据时的降级方案） */
    private pipeNetworkLegacy(dt: number){
        const dirs = [[0,-1],[1,0],[0,1],[-1,0]];
        for(let y=0;y<this.height;y++) for(let x=0;x<this.width;x++){
            const c = this.grid[y][x];
            if(!c.building || c.building.type !== 'pipe' || !c.building.built) continue;
            let hasHeat = false;
            for(const [dx,dy] of dirs){
                const nx=x+dx, ny=y+dy;
                if(nx<0||nx>=this.width||ny<0||ny>=this.height) continue;
                const n = this.grid[ny][nx];
                if(!n.building?.built) continue;
                if(n.building.type==='facility_firepit'||n.building.type==='facility_coalstove'){ hasHeat=true; break; }
                if(n.building.type==='pipe' && n.temperature > this.outdoorTemp + 3){ hasHeat=true; break; }
            }
            if(hasHeat){
                const heatGain = 3 * dt;
                c.temperature = Math.min(this.outdoorTemp + 30, c.temperature + heatGain);
                for(const [dx,dy] of dirs){
                    const nx=x+dx, ny=y+dy;
                    if(nx<0||nx>=this.width||ny<0||ny>=this.height) continue;
                    const n = this.grid[ny][nx];
                    if(!n.building || n.building.type==='floor_wood'){
                        n.temperature += 1 * dt;
                    }
                }
            }
        }
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
