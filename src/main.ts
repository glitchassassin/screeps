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
import { SalesAnalyst } from 'analysts/SalesAnalyst';
import { BuilderManager } from 'managers/BuilderManager';
import { FacilitiesAnalyst } from 'analysts/FacilitiesAnalyst';
import { LogisticsManager } from 'managers/LogisticsManager';
import { DefenseAnalyst } from 'analysts/DefenseAnalyst';
import { DefenseManager } from 'managers/DefenseManager';
import { GrafanaAnalyst } from 'analysts/GrafanaAnalyst';
import { StatisticsAnalyst } from 'analysts/StatisticsAnalyst';
import { RoadArchitect } from 'architects/RoadArchitect';
import { Boardroom } from 'Boardroom/Boardroom';

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
  sales: new SalesAnalyst(),
  facilities: new FacilitiesAnalyst(),
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

console.log(Date.now(), '__buildDate__');

if (Date.now() - JSON.parse('__buildDate__') < 15000) {
  // Built less than 15 seconds ago - fresh code push
  console.log('New code successfully deployed, build time', new Date(JSON.parse('__buildDate__')));
} else {
  console.log('Global reset detected');
}

// Initialize Boardroom

global.boardroom = new Boardroom();

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

  if (Game.time % 50 === 0) {
    // Execute Boardroom plan phase
    global.boardroom.plan()
    // Execute Boardroom cleanup phase
    global.boardroom.cleanup()
  }

  global.boardroom.offices.forEach(office => {
    // Execute Office plan phase
    office.plan();
    // Execute Office run phase
    office.run();
    // Execute Office cleanup phase
    office.cleanup();
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
