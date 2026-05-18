import { _decorator, Component } from 'cc';
import { GameManager } from './core/GameManager';

const { ccclass } = _decorator;

/**
 * GameManagerComp — Cocos Creator 组件封装
 * 挂载到场景根节点即可驱动整个原型主循环
 */
@ccclass('GameManagerComp')
export class GameManagerComp extends Component {
    
    private game: GameManager;
    
    start() {
        this.game = new GameManager();
        
        console.log('═══════════════════════════════════');
        console.log('  极寒末世 · 原型 v0.1');
        console.log('═══════════════════════════════════');
        console.log(`  Day 1, 室外 ${this.game.weather.outdoorTemp}°C`);
        console.log(`  幸存者: ${this.game.survivors.map(s => s.name).join(', ')}`);
        console.log(`  物资: 食物${this.game.inventory.totalFood()} 木材${this.game.inventory.get('fuel_wood')} 煤${this.game.inventory.get('fuel_coal')}`);
        console.log(`  基地: 4x4 木棚 + 火盆`);
        console.log('═══════════════════════════════════');
        console.log('  控制台将每日输出报告...');
        console.log('');
    }
    
    update(dt: number) {
        this.game.update(dt);
    }
}
