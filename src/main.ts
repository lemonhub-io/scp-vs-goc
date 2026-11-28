import { startGame } from './runtime';

if (location.protocol === 'http:' || location.protocol === 'https:') {
  const arena = document.querySelector<HTMLCanvasElement>('#arena');
  const radar = document.querySelector<HTMLCanvasElement>('#radar');
  if (!arena || !radar) throw new Error('The game canvas is missing');
  startGame(arena, radar);
}
