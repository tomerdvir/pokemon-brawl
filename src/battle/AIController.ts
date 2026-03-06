import type { ActionType } from '../ui/ActionButtons';

/**
 * Simple AI that picks actions with weighted randomness.
 * Good enough for a 5-year-old opponent.
 */
export class AIController {
  pickAction(specialCooldown: number, hp: number, maxHp: number, itemUses: number): ActionType {
    const r = Math.random();
    const hpRatio = hp / maxHp;

    // Use item when low HP and still have uses
    if (itemUses > 0 && hpRatio < 0.35 && r < 0.5) {
      return 'item';
    }

    if (specialCooldown <= 0 && r < 0.25) {
      return 'special';
    }
    if (r < 0.7) {
      return 'attack';
    }
    return 'defend';
  }
}
