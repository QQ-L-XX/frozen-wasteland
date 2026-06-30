import { GameManager } from '../../game/NewProject1/assets/scripts/core/GameManager';

function assert(condition: boolean, message: string) {
    if (!condition) throw new Error(message);
}

const store = new Map<string, string>();
(globalThis as any).localStorage = {
    getItem: (key: string) => store.has(key) ? store.get(key) : null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
};

const game = new GameManager('normal');
const beforeSave = game.save();
game.saveLocal({ unlocked: ['blueprint_coal'] });
const beforeLocal = store.get('frost_save');

const msg = game.runP0SmokeForQa({ unlocked: ['blueprint_coal'] });

assert(msg.includes('P0烟测通过'), `unexpected smoke message: ${msg}`);
assert(game.save() === beforeSave, 'P0 smoke mutated the active game');
assert(store.get('frost_save') === beforeLocal, 'P0 smoke mutated local save');

console.log(msg);
console.log('release p0 smoke non-destructive guard passed');
