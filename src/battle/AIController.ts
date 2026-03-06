import type { ActionType } from '../ui/ActionButtons';

/**
 * Simple AI that picks actions with weighted randomness.
 * Good enough for a 5-year-old opponent.
 */
export class AIController {
  pickAction(specialCooldown: number): ActionType {
    const r = Math.random();

    if (specialCooldown <= 0 && r < 0.25) {
      return 'special';
    }
    if (r < 0.7) {
      return 'attack';
    }
    return 'defend';
  }
}
