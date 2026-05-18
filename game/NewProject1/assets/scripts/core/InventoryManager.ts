export class InventoryManager {
    private items=new Map<string,number>();
    add(id:string,qty:number){ this.items.set(id,(this.items.get(id)??0)+qty); }
    remove(id:string,qty:number):number {
        const c=this.items.get(id)??0; const r=Math.min(c,qty);
        this.items.set(id,c-r); if((this.items.get(id)??0)<=0) this.items.delete(id);
        return r;
    }
    get(id:string){ return this.items.get(id)??0; }
    has(id:string,qty:number){ return this.get(id)>=qty; }
    totalFood(){ return ['food_can','food_bread','food_meat_frozen','food_veg'].reduce((s,id)=>s+this.get(id),0); }
    totalFuel(){ return this.get('fuel_wood')*100+this.get('fuel_coal')*300; }
    forEach(fn:(id:string,qty:number)=>void){ this.items.forEach((q,id)=>fn(id,q)); }
}
