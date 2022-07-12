import { runLabs } from "./Labs";
import { runLinks } from "./Links";
import { runTerminal } from "./Terminal";
import { runTowers } from "./Towers";

export const runStructures = () => {
  runTowers();
  runLinks();
  runTerminal();
  runLabs();
}
