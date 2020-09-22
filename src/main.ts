import 'reflect-metadata';
import profiler from 'screeps-profiler';
import { ErrorMapper } from "utils/ErrorMapper";
import { ControllerArchitect } from 'architects/ControllerArchitect';
import { SourceArchitect } from 'architects/SourceArchitect';
import { SourceManager } from 'managers/SourceManager';
import { SpawnSupervisor } from 'supervisors/SpawnSupervisor';
import { TaskSupervisor } from 'supervisors/TaskSupervisor';
import { LogisticsAnalyst } from 'analysts/LogisticsAnalyst';
import { ControllerManager } from 'managers/ControllerManager';
import { SpawnAnalyst } from 'analysts/SpawnAnalyst';
import { ControllerAnalyst } from 'analysts/ControllerAnalyst';
import { MapAnalyst } from 'analysts/MapAnalyst';
import { SourceAnalyst } from 'analysts/SourceAnalyst';
import { BuilderManager } from 'managers/BuilderManager';
import { BuilderAnalyst } from 'analysts/BuilderAnalyst';
import { LogisticsManager } from 'managers/LogisticsManager';
import { DefenseAnalyst } from 'analysts/DefenseAnalyst';
import { DefenseManager } from 'managers/DefenseManager';

global.managers = {
  logistics: new LogisticsManager(),
  source: new SourceManager(),
  controller: new ControllerManager(),
  builder: new BuilderManager(),
  defense: new DefenseManager(),
}
global.analysts = {
  logistics: new LogisticsAnalyst(),
  spawn: new SpawnAnalyst(),
  controller: new ControllerAnalyst(),
  map: new MapAnalyst(),
  source: new SourceAnalyst(),
  builder: new BuilderAnalyst(),
  defense: new DefenseAnalyst(),
}
global.supervisors = {
  task: new TaskSupervisor(),
  spawn: new SpawnSupervisor(),
}


let architects = [
  new ControllerArchitect(),
  new SourceArchitect(),
]

// Initialize memory
if (!Memory.flags) Memory.flags = {};
if (!Memory.rooms) Memory.rooms = {};
if (!Memory.creeps) Memory.creeps = {};

console.log(Date.now(), '__buildDate__');

if (Date.now() - JSON.parse('__buildDate__') < 15000) {
  // Built less than 15 seconds ago - fresh code push
  console.log('New code successfully deployed, build time', new Date(JSON.parse('__buildDate__')));
} else {
  console.log('Global reset detected');
}

// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
function mainLoop() {
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
    Object.values(global.supervisors).forEach(supervisor => supervisor.load(room));

    // Initialize managers
    Object.values(global.managers).forEach(manager => manager.init(room));

    // Run managers
    Object.values(global.managers).forEach(manager => manager.run(room));
    Object.values(global.supervisors).forEach(supervisor => supervisor.run(room));

    // Clean up managers
    Object.values(global.managers).forEach(manager => manager.cleanup(room));
    Object.values(global.supervisors).forEach(supervisor => supervisor.cleanup(room));
  })
}

profiler.enable();
export const loop = ErrorMapper.wrapLoop(() => {
  profiler.wrap(mainLoop)
});
