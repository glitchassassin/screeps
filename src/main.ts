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
import { Request } from 'requests/Request';
import { SourceManager } from 'managers/SourceManager';
import { SpawnManager } from 'managers/SpawnManager';
import { TaskManager } from 'managers/TaskManager';
import { RequestManager } from 'managers/RequestManager';
import { LogisticsAnalyst } from 'analysts/LogisticsAnalyst';
import { spread } from 'lodash';
import { ControllerManager } from 'managers/ControllerManager';
import { SpawnAnalyst } from 'analysts/Spawnanalyst';
import { ControllerAnalyst } from 'analysts/ControllerAnalyst';
import { MapAnalyst } from 'analysts/MapAnalyst';
import { SourceAnalyst } from 'analysts/SourceAnalyst';
import { BuilderManager } from 'managers/BuilderManager';
import { BuilderAnalyst } from 'analysts/BuilderAnalyst';

// Initialize memory
if (!Memory.flags) Memory.flags = {};
if (!Memory.rooms) Memory.rooms = {};
if (!Memory.creeps) Memory.creeps = {};

global.managers = {
  task: new TaskManager(),
  spawn: new SpawnManager(),
  request: new RequestManager(),
  source: new SourceManager(),
  controller: new ControllerManager(),
  builder: new BuilderManager(),
}
global.analysts = {
  logistics: new LogisticsAnalyst(),
  spawn: new SpawnAnalyst(),
  controller: new ControllerAnalyst(),
  map: new MapAnalyst(),
  source: new SourceAnalyst(),
  builder: new BuilderAnalyst()
}


let architects = [
  new ControllerArchitect(),
  new SourceArchitect(),
]

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

  Object.values(Game.rooms).forEach(room => {
    // Consult architects
    architects.forEach(architect => architect.init(room));

    // Load memory
    Object.values(global.managers).forEach(manager => manager.load(room));

    // Initialize managers
    Object.values(global.managers).forEach(manager => manager.init(room));

    // Run managers
    Object.values(global.managers).forEach(manager => manager.run(room));

    // Clean up managers
    Object.values(global.managers).forEach(manager => manager.cleanup(room));
  })
});
