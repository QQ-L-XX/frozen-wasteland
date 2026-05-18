import { WeatherState } from '../data/interfaces';

export class WeatherManager {
    state: WeatherState = { outdoorTemp:-28, windSpeed:10, snowfall:0.3, isBlizzard:false };
    private cooldown=0; private daysLeft=0;

    dailyTick(): string|null {
        if(this.daysLeft>0){
            this.daysLeft--;
            if(this.daysLeft===0){
                this.state.isBlizzard=false; this.state.outdoorTemp=-28; this.state.snowfall=0.3;
                this.cooldown=2+Math.floor(Math.random()*3);
                return '🌤 暴风雪结束了';
            }
        }else if(this.cooldown>0){
            this.cooldown--;
        }else if(Math.random()<0.3){
            this.state.isBlizzard=true;
            this.daysLeft=1+Math.floor(Math.random()*3);
            this.state.outdoorTemp=-38-Math.random()*15;
            this.state.snowfall=0.8;
            return `🌨 暴风雪来袭！持续 ${this.daysLeft} 天，室外 ${this.state.outdoorTemp.toFixed(0)}°C`;
        }
        return null;
    }

    getFuelMultiplier(): number { return this.state.isBlizzard?1.5:1; }
}
