import type { CharacterDef } from '../characters/CharacterData';
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
}

export interface TurnResult {
  attacker: 'p1' | 'p2';
  action: ActionType;
  damage: number;
  defenderHP: number;
  isKO: boolean;
}

const SPECIAL_COOLDOWN = 3;

export class BattleManager {
  state: BattleState;

  constructor(p1Def: CharacterDef, p2Def: CharacterDef) {
    this.state = {
      p1: { def: p1Def, hp: p1Def.hp, specialCooldown: 0 },
      p2: { def: p2Def, hp: p2Def.hp, specialCooldown: 0 },
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

    switch (action) {
      case 'attack': {
        const variance = Math.floor(Math.random() * 5);
        damage = attacker.def.attackPower + variance;
        break;
      }
      case 'special': {
        const variance = Math.floor(Math.random() * 6);
        damage = attacker.def.specialPower + variance;
        attacker.specialCooldown = SPECIAL_COOLDOWN;
        break;
      }
      case 'defend': {
        // Defending heals a small amount and will halve incoming damage on the other side.
        // The "halve incoming" is handled by the caller pairing actions.
        damage = 0;
        // Small self-heal
        attacker.hp = Math.min(attacker.def.hp, attacker.hp + 5);
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

  /** When a defender chose "defend", halve the incoming damage from the paired attack. */
  static applyDefendModifier(result: TurnResult, defenderAction: ActionType): TurnResult {
    if (defenderAction === 'defend' && result.damage > 0) {
      const reduced = Math.floor(result.damage / 2);
      result.damage = reduced;
      // recompute defender HP — the original was already applied, so we heal back the diff
      result.defenderHP += (result.damage); // half was already subtracted, add it back
    }
    return result;
  }
}
