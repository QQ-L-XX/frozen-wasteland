import { BaseCell } from '../data/interfaces';

export class GreenhouseManager {
    built=false; x=0; y=0;
    planted=false; days=0;

    build(x:number,y:number): string|null {
        if(this.built) return '已有温室';
        this.built=true; this.x=x; this.y=y;
        return null;
    }

    plant(grid: BaseCell[][]): string|null {
        if(!this.built) return '需要先建温室';
        const gt=grid[this.y]?.[this.x]?.temperature??-28;
        if(gt<-8) return `温室温度 ${gt.toFixed(1)}°C，需要 ≥ -8°C`;
        if(this.planted) return '已有作物在生长中';
        this.planted=true; this.days=0;
        return null;
    }

    dailyTick(grid: BaseCell[][], addInventory:(id:string,qty:number)=>void): string|null {
        if(!this.planted) return null;
        const gt=grid[this.y]?.[this.x]?.temperature??-28;
        if(gt>=2){
            this.days++;
            if(this.days>=4){ this.planted=false; addInventory('food_veg',15); return '🌾 土豆成熟！收获 食物×15'; }
        }else if(gt<-5){ this.planted=false; return '❄ 作物冻死了'; }
        return null;
    }
}
