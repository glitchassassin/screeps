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
import { GrafanaAnalyst } from 'analysts/GrafanaAnalyst';
import { StatisticsAnalyst } from 'analysts/StatisticsAnalyst';
import { RoadArchitect } from 'architects/RoadArchitect';

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
  grafana: new GrafanaAnalyst(),
  statistics: new StatisticsAnalyst(),
}

global.supervisors = {};


global.architects = {
  controller: new ControllerArchitect(),
  source: new SourceArchitect(),
  road: new RoadArchitect()
}

// Initialize memory
if (!Memory.flags) Memory.flags = {};
if (!Memory.rooms) Memory.rooms = {};
if (!Memory.creeps) Memory.creeps = {};
if (!Memory.metrics) Memory.metrics = {};

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
    // Build supervisors, if needed
    Object.values(Game.rooms).forEach(room => {
      if (!global.supervisors[room.name]) {
        global.supervisors[room.name] = {
          task: new TaskSupervisor(room.name),
          spawn: new SpawnSupervisor(room.name),
        }
      }
    })

    // Load memory
    Object.values(global.analysts).forEach(analyst => analyst.load(room));
    Object.values(global.managers).forEach(manager => manager.load(room));
    Object.values(global.supervisors[room.name]).forEach(supervisor => supervisor.load());

    // Initialize managers
    Object.values(global.analysts).forEach(analyst => analyst.init(room));
    Object.values(global.managers).forEach(manager => manager.init(room));
    Object.values(global.architects).forEach(architect => architect.init(room));

    // Run managers
    Object.values(global.analysts).forEach(analyst => analyst.run(room));
    Object.values(global.managers).forEach(manager => manager.run(room));
    Object.values(global.supervisors[room.name]).forEach(supervisor => supervisor.run());
    Object.values(global.architects).forEach(architect => architect.run(room));

    // Clean up managers
    Object.values(global.analysts).forEach(analyst => analyst.cleanup(room));
    Object.values(global.managers).forEach(manager => manager.cleanup(room));
    Object.values(global.supervisors[room.name]).forEach(supervisor => supervisor.cleanup());
    Object.values(global.architects).forEach(architect => architect.cleanup(room));
  })

  global.analysts.grafana.exportStats();

  if (Game.cpu.bucket >= 10000 && Game.cpu.generatePixel) {
    console.log("Pixel unlocked");
    Game.cpu.generatePixel();
  }
}

profiler.enable();
export const loop = ErrorMapper.wrapLoop(() => {
  profiler.wrap(mainLoop)
});
