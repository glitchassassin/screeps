import {followFlag} from 'behaviors/followFlag';
import {run as roleSpawner, ROLES} from 'roles/spawn';
import {run as roleHarvester} from 'roles/harvester';
import {run as roleBuilder} from 'roles/builder';
import {run as roleUpgrader} from 'roles/upgrader';
import {run as rolePioneer} from 'roles/pioneer';
import { ErrorMapper } from "utils/ErrorMapper";

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
  for (var name in Game.spawns) {
    roleSpawner(Game.spawns[name])
  }

  for(var name in Game.creeps) {
    var creep = Game.creeps[name];
    if (followFlag(creep)) continue; // Follow Named Flag overrides all other behaviors

    if(creep.memory.role == ROLES.MINER) {
      roleHarvester(creep);
    }
    if(creep.memory.role == ROLES.UPGRADER) {
      roleUpgrader(creep);
    }
    if(creep.memory.role == ROLES.BUILDER) {
      roleBuilder(creep);
    }
    if(creep.memory.role == ROLES.PIONEER) {
      rolePioneer(creep);
    }
  }
});
