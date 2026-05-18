/**
 * InventoryManager — 基地库存管理
 * 原型阶段：简化为全局库存字典
 */

import { InventoryItem } from '../data/interfaces';

export class InventoryManager {
    
    private items: Map<string, number> = new Map();
    private freshness: Map<string, number> = new Map(); // itemId→新鲜度
    
    /** 添加物资 */
    add(itemId: string, quantity: number, fresh?: number): void {
        const current = this.items.get(itemId) ?? 0;
        this.items.set(itemId, current + quantity);
        if (fresh !== undefined) {
            this.freshness.set(itemId, fresh);
        }
    }
    
    /** 移除物资。返回实际移除量（不够则全部移除） */
    remove(itemId: string, quantity: number): number {
        const current = this.items.get(itemId) ?? 0;
        const removed = Math.min(current, quantity);
        this.items.set(itemId, current - removed);
        if (this.items.get(itemId)! <= 0) {
            this.items.delete(itemId);
        }
        return removed;
    }
    
    /** 查询库存量 */
    get(itemId: string): number {
        return this.items.get(itemId) ?? 0;
    }
    
    /** 是否有足够数量 */
    has(itemId: string, quantity: number): boolean {
        return this.get(itemId) >= quantity;
    }
    
    /** 获取新鲜度 */
    getFreshness(itemId: string): number {
        return this.freshness.get(itemId) ?? 1.0;
    }
    
    /** 每日调用：降低食物新鲜度 */
    tickDay(outdoorTemp: number): void {
        const tempCoeff = outdoorTemp < -10 ? 0.1 :
                          outdoorTemp < 0   ? 0.5 :
                          outdoorTemp < 10  ? 1.0 : 2.0;
        
        const foodDecayRates: Record<string, number> = {
            food_can:     0.02 * tempCoeff,
            food_ration:  0.01 * tempCoeff,
            food_bread:   0.05 * tempCoeff,
            food_meat_frozen: 0.15 * tempCoeff,
            food_veg:     0.03 * tempCoeff,
        };
        
        for (const [id, rate] of Object.entries(foodDecayRates)) {
            if (!this.items.has(id)) continue;
            const current = this.freshness.get(id) ?? 1.0;
            this.freshness.set(id, Math.max(0, current - rate));
        }
    }
    
    /** 导出为数组（供 UI 显示） */
    toArray(): InventoryItem[] {
        const arr: InventoryItem[] = [];
        for (const [id, qty] of this.items) {
            if (qty <= 0) continue;
            arr.push({
                itemId: id,
                quantity: qty,
                freshness: this.freshness.get(id),
            });
        }
        return arr;
    }
    
    /** 计算食物总量 */
    totalFood(): number {
        const foodIds = ['food_can', 'food_ration', 'food_bread', 'food_meat_frozen', 'food_veg', 'food_soup'];
        return foodIds.reduce((sum, id) => sum + this.get(id), 0);
    }
    
    /** 计算燃料总量（换算为标准热量单位） */
    totalFuel(): number {
        return this.get('fuel_wood') * 100 +
               this.get('fuel_coal') * 300 +
               this.get('fuel_propane') * 800 +
               this.get('fuel_plastic') * 80;
    }
}
