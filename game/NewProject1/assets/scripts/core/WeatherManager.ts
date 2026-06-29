import { WeatherState, Season } from '../data/interfaces';

/** 每季天数 */
const SEASON_DAYS = 120;

/** 季节参数表 */
const SEASON_PARAMS: Record<Season, { baseTemp: number; tempRange: number; blizChance: number; name: string; icon: string }> = {
    [Season.SPRING]: { baseTemp: -5,  tempRange: 15, blizChance: 0.15, name: '春', icon: '🌸' },
    [Season.SUMMER]: { baseTemp: +5,  tempRange: 10, blizChance: 0.05, name: '夏', icon: '☀️' },
    [Season.AUTUMN]: { baseTemp: -7,  tempRange: 15, blizChance: 0.30, name: '秋', icon: '🍂' },
    [Season.WINTER]: { baseTemp: -35, tempRange: 15, blizChance: 0.50, name: '冬', icon: '❄️' },
};

/** 季节顺序（循环） */
const SEASON_ORDER: Season[] = [Season.SPRING, Season.SUMMER, Season.AUTUMN, Season.WINTER];

export class WeatherManager {
    state: WeatherState = {
        outdoorTemp: -5,
        windSpeed: 10,
        snowfall: 0.2,
        isBlizzard: false,
        season: Season.SPRING,
        seasonDay: 1,
    };

    private cooldown = 0;
    private daysLeft = 0;
    private year = 1;

    /** 初始化季节（默认春天 Day1） */
    init(day: number) {
        const totalDay = day - 1;
        this.year = Math.floor(totalDay / (SEASON_DAYS * 4)) + 1;
        const dayInYear = totalDay % (SEASON_DAYS * 4);
        const seasonIdx = Math.floor(dayInYear / SEASON_DAYS);
        this.state.season = SEASON_ORDER[seasonIdx];
        this.state.seasonDay = (dayInYear % SEASON_DAYS) + 1;
        this.updateBaseTemp();
    }

    dailyTick(): string | null {
        this.state.seasonDay++;
        if (this.state.seasonDay > SEASON_DAYS) {
            this.state.seasonDay = 1;
            const idx = SEASON_ORDER.indexOf(this.state.season);
            this.state.season = SEASON_ORDER[(idx + 1) % 4];
            if (this.state.season === Season.SPRING) this.year++;
            this.updateBaseTemp();
            return this.seasonTransitionMsg();
        }

        if (this.daysLeft > 0) {
            this.daysLeft--;
            if (this.daysLeft === 0) {
                this.state.isBlizzard = false;
                this.updateBaseTemp();
                this.cooldown = 2 + Math.floor(Math.random() * 3);
                return '🌤 暴风雪结束了';
            }
        } else if (this.cooldown > 0) {
            this.cooldown--;
        } else {
            const params = SEASON_PARAMS[this.state.season];
            if (Math.random() < params.blizChance) {
                this.state.isBlizzard = true;
                this.daysLeft = 1 + Math.floor(Math.random() * 3);
                this.state.outdoorTemp = params.baseTemp - params.tempRange - Math.random() * 10;
                this.state.snowfall = 0.8;
                return `🌨 暴风雪来袭！持续 ${this.daysLeft} 天，室外 ${this.state.outdoorTemp.toFixed(0)}°C`;
            }
        }

        if (!this.state.isBlizzard && this.daysLeft === 0) {
            const params = SEASON_PARAMS[this.state.season];
            const drift = (Math.random() - 0.5) * params.tempRange;
            this.state.outdoorTemp = params.baseTemp + drift;
        }

        return null;
    }

    private updateBaseTemp() {
        const params = SEASON_PARAMS[this.state.season];
        if (!this.state.isBlizzard) {
            const drift = (Math.random() - 0.5) * params.tempRange;
            this.state.outdoorTemp = params.baseTemp + drift;
        }
    }

    private seasonTransitionMsg(): string {
        const p = SEASON_PARAMS[this.state.season];
        return `${p.icon} ${p.name}季来临！（第${this.year}年）室外基准 ${p.baseTemp}°C`;
    }

    getFuelMultiplier(): number {
        let m = this.state.isBlizzard ? 1.5 : 1;
        if (this.state.season === Season.WINTER) m += 0.3;
        return m;
    }

    getSeasonLabel(): string {
        const p = SEASON_PARAMS[this.state.season];
        return `${p.icon}${p.name}`;
    }

    getSeasonDay(): number { return this.state.seasonDay; }
    getYear(): number { return this.year; }
}