/** 食物腐坏速率（每日衰减新鲜度百分比） */
const FOOD_DECAY: Record<string, number> = {
    food_can: 2, food_bread: 5, food_ration: 3, food_soup: 10,
    food_mushroom: 5, food_meat_frozen: 3, food_veg: 25, food_chocolate: 5, food_vitamin: 5,
};

interface ItemEntry { qty: number; freshness: number; }

export class InventoryManager {
    private items = new Map<string, ItemEntry>();

    add(id: string, qty: number, freshness = 100) {
        const prev = this.items.get(id);
        if (prev) {
            const totalQty = prev.qty + qty;
            const totalFresh = prev.qty * prev.freshness + qty * freshness;
            prev.qty = totalQty;
            prev.freshness = totalFresh / totalQty;
        } else {
            this.items.set(id, { qty, freshness });
        }
    }

    remove(id: string, qty: number): number {
        const entry = this.items.get(id);
        if (!entry) return 0;
        const r = Math.min(entry.qty, qty);
        entry.qty -= r;
        if (entry.qty <= 0) this.items.delete(id);
        return r;
    }

    get(id: string): number {
        return this.items.get(id)?.qty ?? 0;
    }

    has(id: string, qty: number): boolean {
        return this.get(id) >= qty;
    }

    /** 获取物品新鲜度（0-100），非食物返回100 */
    getFreshness(id: string): number {
        return this.items.get(id)?.freshness ?? 100;
    }

    /** 每日腐坏处理（只影响食物） */
    decayFood(tempMultiplier: number) {
        for (const [id, entry] of this.items) {
            const decayRate = FOOD_DECAY[id];
            if (!decayRate) continue;
            const loss = decayRate * tempMultiplier;
            entry.freshness = Math.max(0, entry.freshness - loss);
            if (entry.freshness <= 0) {
                this.items.delete(id);
            }
        }
    }

    /** 获取食物消耗倍率（根据新鲜度） */
    getFoodEfficiency(id: string): number {
        const f = this.getFreshness(id);
        if (f >= 50) return 1;
        if (f > 0) return 0.5;
        return 0;
    }

    totalFood(): number {
        return ['food_can','food_bread','food_ration','food_soup','food_mushroom',
            'food_meat_frozen','food_veg','food_chocolate','food_vitamin']
            .reduce((s, id) => s + this.get(id), 0);
    }

    totalFuel(): number {
        return this.get('fuel_wood') * 100 + this.get('fuel_coal') * 300 + this.get('fuel_propane') * 800;
    }

    forEach(fn: (id: string, qty: number) => void) {
        this.items.forEach((entry, id) => fn(id, entry.qty));
    }
}