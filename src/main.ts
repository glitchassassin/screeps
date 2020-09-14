import {followFlag} from 'behaviors/followFlag';
import {run as roleSpawner, ROLES} from 'roles/spawn';
import {run as roleHarvester} from 'roles/harvester';
import {run as roleBuilder} from 'roles/builder';
import {run as roleUpgrader} from 'roles/upgrader';
import {run as rolePioneer} from 'roles/pioneer';
import {run as roleHauler} from 'roles/hauler';
import {run as roleThug} from 'roles/thug';
import { ErrorMapper } from "utils/ErrorMapper";
import { ControllerArchitect } from 'architects/ControllerArchitect';
import { SourceArchitect } from 'architects/SourceArchitect';

let controllerArchitect = new ControllerArchitect;
let sourceArchitect = new SourceArchitect;

// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
export const loop = ErrorMapper.wrapLoop(() => {

  // Automatically delete memory of missing creeps
  if(Game.time%1500 === 0) {
    for (const name in Memory.creeps) {
      if (!(name in Game.creeps)) {
        delete Memory.creeps[name];
      }
    }
  }

  // Consult architects
  Object.values(Game.rooms).forEach(room => {
    controllerArchitect.init(room);
    sourceArchitect.init(room);
  })

  console.log(Game.cpu.getUsed());
});
