import type { CharacterDef } from '../characters/CharacterData';
import { getTypeMultiplier } from '../characters/CharacterData';
import type { ActionType } from '../ui/ActionButtons';

export interface BattleState {
  p1: FighterState;
  p2: FighterState;
  turn: number;
  winner: 'p1' | 'p2' | null;
}

export interface FighterState {
  def: CharacterDef;
  hp: number;
  specialCooldown: number;
  itemUses: number;
}

export interface TurnResult {
  attacker: 'p1' | 'p2';
  action: ActionType;
  damage: number;
  defenderHP: number;
  isKO: boolean;
  /** Non-zero when the attacker used an item to heal */
  healAmount: number;
  typeMultiplier: number;
}

const SPECIAL_COOLDOWN = 3;
const MAX_ITEM_USES = 2;
const ITEM_HEAL = 20;

export class BattleManager {
  state: BattleState;

  constructor(p1Def: CharacterDef, p2Def: CharacterDef) {
    this.state = {
      p1: { def: p1Def, hp: p1Def.hp, specialCooldown: 0, itemUses: MAX_ITEM_USES },
      p2: { def: p2Def, hp: p2Def.hp, specialCooldown: 0, itemUses: MAX_ITEM_USES },
      turn: 1,
      winner: null,
    };
  }

  /**
   * Execute one side's action.  Returns what happened so the scene can animate it.
   */
  executeAction(who: 'p1' | 'p2', action: ActionType): TurnResult {
    const attacker = this.state[who];
    const defender = this.state[who === 'p1' ? 'p2' : 'p1'];

    let damage = 0;
    let healAmount = 0;
    let typeMultiplier = 1;

    switch (action) {
      case 'attack': {
        const variance = Math.floor(Math.random() * 5);
        const raw = attacker.def.attackPower + variance;
        typeMultiplier = getTypeMultiplier(attacker.def.type, defender.def.type);
        damage = Math.max(1, Math.round(raw * typeMultiplier) - Math.floor(defender.def.defense / 2));
        break;
      }
      case 'special': {
        const variance = Math.floor(Math.random() * 6);
        const raw = attacker.def.specialPower + variance;
        typeMultiplier = getTypeMultiplier(attacker.def.type, defender.def.type);
        damage = Math.max(1, Math.round(raw * typeMultiplier) - Math.floor(defender.def.defense / 3));
        attacker.specialCooldown = SPECIAL_COOLDOWN;
        break;
      }
      case 'defend': {
        damage = 0;
        attacker.hp = Math.min(attacker.def.hp, attacker.hp + 5);
        break;
      }
      case 'item': {
        damage = 0;
        attacker.itemUses--;
        const heal = ITEM_HEAL;
        const before = attacker.hp;
        attacker.hp = Math.min(attacker.def.hp, attacker.hp + heal);
        healAmount = attacker.hp - before;
        break;
      }
    }

    // Apply damage to defender
    defender.hp = Math.max(0, defender.hp - damage);

    const isKO = defender.hp <= 0;
    if (isKO) {
      this.state.winner = who;
    }

    return {
      attacker: who,
      action,
      damage,
      defenderHP: defender.hp,
      isKO,
      healAmount,
      typeMultiplier,
    };
  }

  /**
   * Tick cooldowns down at the end of a full turn (both players acted).
   */
  endTurn(): void {
    if (this.state.p1.specialCooldown > 0) this.state.p1.specialCooldown--;
    if (this.state.p2.specialCooldown > 0) this.state.p2.specialCooldown--;
    this.state.turn++;
  }
}
