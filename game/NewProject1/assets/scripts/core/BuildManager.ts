import { BaseCell, BuildingType, TerrainType } from '../data/interfaces';

const RECIPES: Record<string,{material:string;cost:number;building:BuildingType}> = {
    wall:{material:'mat_wood',cost:3,building:BuildingType.WALL_WOOD},
    floor:{material:'mat_wood',cost:1,building:BuildingType.FLOOR_WOOD},
    bed:{material:'mat_insulation',cost:3,building:BuildingType.BED_MATTRESS},
    coalstove:{material:'mat_metal',cost:5,building:BuildingType.FACILITY_COALSTOVE},
    shelf:{material:'mat_wood',cost:3,building:BuildingType.STORAGE_SHELF},
    pipe:{material:'mat_metal',cost:1,building:BuildingType.PIPE,extraMat:'mat_insulation',extraCost:1},
};

export class BuildManager {
    blueprints: {x:number;y:number;material:string;cost:number}[] = [];
    readonly SIZE=50;
    grid: BaseCell[][] = [];

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

    plan(type:string,x:number,y:number):string|null {
        const r=RECIPES[type];
        if(!r) return '未知类型。可选: wall, floor, bed, coalstove, shelf, pipe';
        if(x<0||x>=this.SIZE||y<0||y>=this.SIZE) return '坐标越界';
        if(this.grid[y][x].building) return '该位置已有建筑';
        this.grid[y][x].building={type:r.building,built:false,buildProgress:0,health:100};
        this.blueprints.push({x,y,material:r.material,cost:r.cost});
        if(r.extraMat) this.blueprints[this.blueprints.length-1]={x,y,material:r.extraMat,cost:r.extraCost};
        return null;
    }

    build(type:string,x:number,y:number):string|null {
        const r=RECIPES[type];
        if(!r) return '未知类型';
        if(x<0||x>=this.SIZE||y<0||y>=this.SIZE) return '坐标越界';
        if(this.grid[y][x].building) return '该位置已有建筑';
        this.grid[y][x].building={type:r.building,built:true,buildProgress:1,health:100};
        return null;
    }

    placeBuilding(x:number,y:number){
        if(this.grid[y][x].building) this.grid[y][x].building!.built=true;
    }

    wallRect(x1:number,y1:number,x2:number,y2:number):number{
        let count=0;
        const w=Math.abs(x2-x1)+1, h=Math.abs(y2-y1)+1;
        for(let x=Math.min(x1,x2);x<=Math.max(x1,x2);x++){
            if(this.placeIfEmpty(x,Math.min(y1,y2))) count++;
            if(this.placeIfEmpty(x,Math.max(y1,y2))) count++;
        }
        for(let y=Math.min(y1,y2)+1;y<Math.max(y1,y2);y++){
            if(this.placeIfEmpty(Math.min(x1,x2),y)) count++;
            if(this.placeIfEmpty(Math.max(x1,x2),y)) count++;
        }
        return count;
    }

    private placeIfEmpty(x:number,y:number):boolean{
        if(x<0||x>=this.SIZE||y<0||y>=this.SIZE) return false;
        if(this.grid[y][x].building) return false;
        this.grid[y][x].building={type:BuildingType.WALL_WOOD,built:true,buildProgress:1,health:60};
        return true;
    }
}
