import { runLabs } from './Labs';
import { runLinks } from './Links';
import { runObserver } from './Observer';
import { runPowerSpawn } from './PowerSpawn';
import { runRamparts } from './Ramparts';
import { runTerminal } from './Terminal';
import { runTowers } from './Towers';

export const runStructures = () => {
  runTowers();
  runLinks();
  runTerminal();
  runLabs();
  runObserver();
  runPowerSpawn();
  runRamparts();
};
