import Phaser from 'phaser';
import { PreloadScene } from './scenes/PreloadScene';
import { TitleScene } from './scenes/TitleScene';
import { CharacterSelectScene } from './scenes/CharacterSelectScene';
import { BattleScene } from './scenes/BattleScene';

const getViewportSize = () => ({
  width: Math.max(window.innerWidth, document.documentElement.clientWidth || 0),
  height: Math.max(
    Math.round(window.visualViewport?.height ?? window.innerHeight),
    document.documentElement.clientHeight || 0,
  ),
});

const { width, height } = getViewportSize();

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width,
  height,
  parent: 'app',
  backgroundColor: '#000000',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [PreloadScene, TitleScene, CharacterSelectScene, BattleScene],
};

const game = new Phaser.Game(config);

const resizeGame = () => {
  const { width: nextWidth, height: nextHeight } = getViewportSize();
  game.scale.resize(nextWidth, nextHeight);
};

window.addEventListener('resize', resizeGame);
window.addEventListener('orientationchange', resizeGame);
window.visualViewport?.addEventListener('resize', resizeGame);
