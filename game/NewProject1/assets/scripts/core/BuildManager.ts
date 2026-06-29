import { BaseCell, BuildingType, TerrainType, Room, PipeNetwork } from '../data/interfaces';

const RECIPES: Record<string,{material:string;cost:number;building:BuildingType;extraMat?:string;extraCost?:number}> = {
    wall:{material:'mat_wood',cost:3,building:BuildingType.WALL_WOOD},
    floor:{material:'mat_wood',cost:1,building:BuildingType.FLOOR_WOOD},
    bed:{material:'mat_insulation',cost:3,building:BuildingType.BED_MATTRESS},
    coalstove:{material:'mat_metal',cost:5,building:BuildingType.FACILITY_COALSTOVE},
    shelf:{material:'mat_wood',cost:3,building:BuildingType.STORAGE_SHELF},
    pipe:{material:'mat_metal',cost:1,building:BuildingType.PIPE,extraMat:'mat_insulation',extraCost:1},
    workshop:{material:'mat_metal',cost:10,building:BuildingType.FACILITY_WORKSHOP,extraMat:'part_circuit',extraCost:3},
    door:{material:'mat_wood',cost:5,building:BuildingType.DOOR_WOOD,extraMat:'mat_metal',extraCost:2},
    rwall:{material:'mat_wood',cost:5,building:BuildingType.WALL_REINFORCED,extraMat:'mat_metal',extraCost:2},
    medical:{material:'mat_metal',cost:5,building:BuildingType.FACILITY_MEDICAL,extraMat:'mat_insulation',extraCost:3},
    lantern:{material:'mat_metal',cost:3,building:BuildingType.LIGHT_LANTERN},
    trap:{material:'mat_metal',cost:3,building:BuildingType.FACILITY_TRAP,extraMat:'mat_wood',extraCost:4},
    window:{material:'mat_glass',cost:2,building:BuildingType.WINDOW,extraMat:'mat_wood',extraCost:2},
    kitchen:{material:'mat_metal',cost:3,building:BuildingType.FACILITY_KITCHEN,extraMat:'mat_wood',extraCost:2},
    boiler:{material:'mat_metal',cost:8,building:BuildingType.FACILITY_BOILER,extraMat:'mat_insulation',extraCost:5},
    radio:{material:'mat_metal',cost:10,building:BuildingType.FACILITY_RADIO,extraMat:'part_circuit',extraCost:5},
    // T4-T5 高级建筑
    uwall:{material:'mat_metal',cost:4,building:BuildingType.WALL_UNDERGROUND,extraMat:'mat_insulation',extraCost:5},
    geothermal:{material:'mat_metal',cost:20,building:BuildingType.FACILITY_GEOTHERMAL,extraMat:'part_circuit',extraCost:8},
    turret:{material:'mat_metal',cost:12,building:BuildingType.DEFENSE_TURRET,extraMat:'part_circuit',extraCost:4},
};

export class BuildManager {
    blueprints: {x:number;y:number;material:string;cost:number}[] = [];
    readonly SIZE=50;
    grid: BaseCell[][] = [];

    // 连通性缓存
    rooms: Room[] = [];
    pipeNetworks: PipeNetwork[] = [];
    dirty = true;
    private roomIdCounter = 0;
    private netIdCounter = 0;

    init(outdoorTemp:number){
        for(let y=0;y<this.SIZE;y++){
            this.grid[y]=[];
            for(let x=0;x<this.SIZE;x++)
                this.grid[y][x]={x,y,terrain:TerrainType.SNOW,building:null,temperature:outdoorTemp};
        }
        // 初始木棚
        const sx=24,sy=24;
        for(let dy=0;dy<4;dy++) for(let dx=0;dx<4;dx++)
            if(dx===0||dx===3||dy===0||dy===3)
                this.grid[sy+dy][sx+dx].building={type:BuildingType.WALL_WOOD,built:true,buildProgress:1,health:60};
        this.grid[sy+2][sx+1].building={type:BuildingType.FACILITY_FIREPIT,built:true,buildProgress:1,health:100};
    }

    hasCoalStove(): boolean {
        return this.grid.some(row=>row.some(c=>c.building?.type===BuildingType.FACILITY_COALSTOVE));
    }
    hasWorkshop(): boolean {
        return this.grid.some(row=>row.some(c=>c.building?.type===BuildingType.FACILITY_WORKSHOP && c.building?.built));
    }
    hasBoiler(): boolean {
        return this.grid.some(row=>row.some(c=>c.building?.type===BuildingType.FACILITY_BOILER && c.building?.built));
    }
    hasGeothermal(): boolean {
        return this.grid.some(row=>row.some(c=>c.building?.type===BuildingType.FACILITY_GEOTHERMAL && c.building?.built));
    }
    hasTurret(): boolean {
        return this.grid.some(row=>row.some(c=>c.building?.type===BuildingType.DEFENSE_TURRET && c.building?.built));
    }
    /** 统计地下掩体墙数量（用于全局保温加成） */
    countUndergroundWalls(): number {
        return this.grid.flat().filter(c=>c.building?.type===BuildingType.WALL_UNDERGROUND && c.building?.built).length;
    }

    plan(type:string,x:number,y:number):string|null {
        const r=RECIPES[type];
        if(!r) return '未知类型。可选: wall, floor, bed, coalstove, shelf, pipe';
        if(x<0||x>=this.SIZE||y<0||y>=this.SIZE) return '坐标越界';
        if(this.grid[y][x].building && type!=='pipe' && type!=='door' && type!=='window') return '该位置已有建筑';
        this.grid[y][x].building={type:r.building,built:false,buildProgress:0,health:100};
        this.blueprints.push({x,y,material:r.material,cost:r.cost});
        if(r.extraMat) this.blueprints[this.blueprints.length-1]={x,y,material:r.extraMat,cost:r.extraCost!};
        this.dirty = true;
        return null;
    }

    build(type:string,x:number,y:number):string|null {
        const r=RECIPES[type];
        if(!r) return '未知类型';
        if(x<0||x>=this.SIZE||y<0||y>=this.SIZE) return '坐标越界';
        if(this.grid[y][x].building && type!=='pipe' && type!=='door' && type!=='window') return '该位置已有建筑';
        this.grid[y][x].building={type:r.building,built:true,buildProgress:1,health:100};
        this.dirty = true;
        return null;
    }

    placeBuilding(x:number,y:number){
        if(this.grid[y][x].building){ this.grid[y][x].building!.built=true; this.dirty=true; }
    }

    /** 计算矩形墙壁需要多少格（不实际放置） */
    wallRectCount(x1:number,y1:number,x2:number,y2:number):number{
        let count=0;
        for(let x=Math.min(x1,x2);x<=Math.max(x1,x2);x++){
            if(!this.hasBuilding(x,Math.min(y1,y2))) count++;
            if(!this.hasBuilding(x,Math.max(y1,y2))) count++;
        }
        for(let y=Math.min(y1,y2)+1;y<Math.max(y1,y2);y++){
            if(!this.hasBuilding(Math.min(x1,x2),y)) count++;
            if(!this.hasBuilding(Math.max(x1,x2),y)) count++;
        }
        return count;
    }

    /** 实际放置矩形墙壁 */
    wallRectPlace(x1:number,y1:number,x2:number,y2:number):void{
        for(let x=Math.min(x1,x2);x<=Math.max(x1,x2);x++){
            this.placeIfEmpty(x,Math.min(y1,y2));
            this.placeIfEmpty(x,Math.max(y1,y2));
        }
        for(let y=Math.min(y1,y2)+1;y<Math.max(y1,y2);y++){
            this.placeIfEmpty(Math.min(x1,x2),y);
            this.placeIfEmpty(Math.max(x1,x2),y);
        }
        this.dirty = true;
    }

    private hasBuilding(x:number,y:number):boolean{
        if(x<0||x>=this.SIZE||y<0||y>=this.SIZE) return true;
        return !!this.grid[y][x].building;
    }

    /** 保留旧版兼容（计数+放置） */
    wallRect(x1:number,y1:number,x2:number,y2:number):number{
        const count = this.wallRectCount(x1,y1,x2,y2);
        this.wallRectPlace(x1,y1,x2,y2);
        return count;
    }

    private placeIfEmpty(x:number,y:number):boolean{
        if(x<0||x>=this.SIZE||y<0||y>=this.SIZE) return false;
        if(this.grid[y][x].building) return false;
        this.grid[y][x].building={type:BuildingType.WALL_WOOD,built:true,buildProgress:1,health:60};
        return true;
    }

    // ==================== 房间检测 ====================

    /** BFS 洪水填充：从空地/地板出发，遇墙则停 */
    detectRooms(): Room[] {
        const visited = new Set<string>();
        const rooms: Room[] = [];
        this.roomIdCounter = 0;

        for(let y=0;y<this.SIZE;y++) for(let x=0;x<this.SIZE;x++){
            const key = `${x},${y}`;
            if(visited.has(key)) continue;
            const cell = this.grid[y][x];
            // 跳过墙壁和管道（它们不是房间内部）
            if(cell.building?.type===BuildingType.WALL_WOOD) continue;
            if(cell.building?.type===BuildingType.WALL_REINFORCED) continue;
            if(cell.building?.type===BuildingType.PIPE && cell.building.built) continue;

            // BFS
            const roomCells: {x:number;y:number}[] = [];
            const q: [number,number][] = [[x,y]];
            visited.add(key);

            while(q.length>0){
                const [cx,cy] = q.shift()!;
                roomCells.push({x:cx,y:cy});

                for(const [dx,dy] of [[0,-1],[1,0],[0,1],[-1,0]]){
                    const nx=cx+dx, ny=cy+dy;
                    if(nx<0||nx>=this.SIZE||ny<0||ny>=this.SIZE) continue;
                    const nk = `${nx},${ny}`;
                    if(visited.has(nk)) continue;
                    const nc = this.grid[ny][nx];
                    // 墙和管道不可通行（门可通行）
                    if(nc.building?.type===BuildingType.WALL_WOOD) continue;
                    if(nc.building?.type===BuildingType.WALL_REINFORCED) continue;
                    if(nc.building?.type===BuildingType.PIPE) continue;
                    visited.add(nk);
                    q.push([nx,ny]);
                }
            }

            if(roomCells.length>=4){ // 忽略微小空间
                rooms.push({ id: this.roomIdCounter++, cells: roomCells, insulationRate: 0 });
            }
        }

        // 计算每个房间的保温率
        for(const room of rooms){
            room.insulationRate = this.calcInsulation(room);
        }

        return rooms;
    }

    /** 计算房间保温率 = 有墙的边界 / 总边界 */
    private calcInsulation(room: Room): number {
        const cellSet = new Set(room.cells.map(c=>`${c.x},${c.y}`));
        let wallCount = 0, totalBorder = 0;

        for(const c of room.cells){
            for(const [dx,dy] of [[0,-1],[1,0],[0,1],[-1,0]]){
                const nk = `${c.x+dx},${c.y+dy}`;
                if(!cellSet.has(nk)){
                    totalBorder++;
                    const nx=c.x+dx, ny=c.y+dy;
                    if(nx>=0&&nx<this.SIZE&&ny>=0&&ny<this.SIZE &&
                       this.grid[ny][nx].building?.type===BuildingType.WALL_WOOD){
                        wallCount++;
                    }
                }
            }
        }
        return totalBorder>0 ? wallCount/totalBorder : 0;
    }

    // ==================== 管道连通性 ====================

    /** BFS 检测所有管道网络及其连接的热源和房间 */
    detectPipeNetworks(): PipeNetwork[] {
        const visited = new Set<string>();
        const networks: PipeNetwork[] = [];
        this.netIdCounter = 0;

        for(let y=0;y<this.SIZE;y++) for(let x=0;x<this.SIZE;x++){
            const key = `${x},${y}`;
            if(visited.has(key)) continue;
            const cell = this.grid[y][x];
            if(!cell.building?.built || cell.building.type!==BuildingType.PIPE) continue;

            // BFS 管道路径
            const pipes: {x:number;y:number}[] = [];
            let heatSource: {x:number;y:number;type:BuildingType}|null = null;
            const q: [number,number][] = [[x,y]];
            visited.add(key);

            while(q.length>0){
                const [cx,cy] = q.shift()!;
                pipes.push({x:cx,y:cy});

                for(const [dx,dy] of [[0,-1],[1,0],[0,1],[-1,0]]){
                    const nx=cx+dx, ny=cy+dy;
                    if(nx<0||nx>=this.SIZE||ny<0||ny>=this.SIZE) continue;
                    const nk = `${nx},${ny}`;
                    const nc = this.grid[ny][nx];

                    // 检测热源
                    if(nc.building?.built && (
                        nc.building.type===BuildingType.FACILITY_FIREPIT ||
                        nc.building.type===BuildingType.FACILITY_COALSTOVE ||
                        nc.building.type===BuildingType.FACILITY_BOILER)){
                        heatSource = {x:nx, y:ny, type:nc.building.type};
                    }

                    // 延伸管道
                    if(nc.building?.type===BuildingType.PIPE && !visited.has(nk)){
                        visited.add(nk);
                        q.push([nx,ny]);
                    }
                }
            }

            networks.push({
                id: this.netIdCounter++,
                pipes,
                heatSource: heatSource ? { x: heatSource.x, y: heatSource.y, type: heatSource.type } : undefined,
                connectedRooms: [],
            });
        }

        return networks;
    }

    /** 匹配管道网络接触了哪些房间（管道与房间格相邻即为连通） */
    private matchPipesToRooms(networks: PipeNetwork[], rooms: Room[]): void {
        // 先重置所有房间
        for(const room of rooms) room.pipeNetworkId = undefined;
        for(const net of networks){
            net.connectedRooms = [];
            const pipeSet = new Set(net.pipes.map(p=>`${p.x},${p.y}`));

            for(const room of rooms){
                if(room.pipeNetworkId !== undefined) continue; // 已分配到其他网络
                for(const cell of room.cells){
                    let connected = false;
                    for(const [dx,dy] of [[0,-1],[1,0],[0,1],[-1,0]]){
                        if(pipeSet.has(`${cell.x+dx},${cell.y+dy}`)){
                            net.connectedRooms.push(room.id);
                            room.pipeNetworkId = net.id;
                            connected = true;
                            break;
                        }
                    }
                    if(connected) break;
                }
            }
        }
    }

    /** 重新计算所有连通性（建造/拆除后调用） */
    recomputeConnectivity(): void {
        if(!this.dirty) return;
        this.rooms = this.detectRooms();
        this.pipeNetworks = this.detectPipeNetworks();
        this.matchPipesToRooms(this.pipeNetworks, this.rooms);
        this.dirty = false;
    }

    /** 获取某个管网的供热效率 */
    getPipeHeatEfficiency(netId: number): number {
        const net = this.pipeNetworks.find(n=>n.id===netId);
        if(!net || !net.heatSource) return 0;
        // 管道越长衰减越大
        const dist = net.pipes.length;
        return Math.max(0.2, 1 - dist * 0.02);
    }

    /** 获取格子的房间ID */
    getRoomId(x: number, y: number): number|undefined {
        for(const room of this.rooms){
            for(const c of room.cells){
                if(c.x===x && c.y===y) return room.id;
            }
        }
        return undefined;
    }
}
