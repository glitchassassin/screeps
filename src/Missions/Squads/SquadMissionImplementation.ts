import { SpawnOrder } from 'Minions/spawnQueues';
import { SquadMission, SquadMissionType } from '.';

export class SquadMissionImplementation {
  constructor(public mission: SquadMission<SquadMissionType, any>) {}

  register(creep: Creep) {
    throw new Error('Not implemented yet');
  }
  spawn(): SpawnOrder[] {
    throw new Error('Not implemented yet');
  }
  run() {
    throw new Error('Not implemented yet');
  }
  status() {
    throw new Error('Not implemented yet');
  }
}
