import { BehaviorResult } from 'Behaviors/Behavior';
import { getResourcesFromMineContainer } from 'Behaviors/getResourcesFromMineContainer';
import { setState, States } from 'Behaviors/states';
import { MinionBuilders, MinionTypes } from 'Minions/minionTypes';
import { createSpawnOrder, SpawnOrder } from 'Minions/spawnQueues';
import { createMission, Mission, MissionType } from 'Missions/Mission';
import { moveTo } from 'screeps-cartographer';
import { roomPlans } from 'Selectors/roomPlans';
import { spawnEnergyAvailable } from 'Selectors/spawnEnergyAvailable';
import { MissionImplementation } from './MissionImplementation';

export interface MineHaulerMission extends Mission<MissionType.MINE_HAULER> {
  data: {
    mineral: Id<Mineral>;
  };
}

export function createMineHaulerOrder(office: string, mineral: Id<Mineral>): SpawnOrder {
  const body = MinionBuilders[MinionTypes.ACCOUNTANT](spawnEnergyAvailable(office));
  const estimate = {
    cpu: CREEP_LIFE_TIME * 0.4,
    energy: 0
  };

  const mission = createMission({
    office,
    priority: 7,
    type: MissionType.MINE_HAULER,
    data: {
      mineral
    },
    estimate
  });

  // Set name
  const name = `ACCOUNTANT-${mission.office}-${mission.id}`;

  return createSpawnOrder(mission, {
    name,
    body
  });
}

export class MineHauler extends MissionImplementation {
  static minionLogic(mission: Mission<MissionType>, creep: Creep): void {
    // Set some additional data on the mission
    mission.data.harvestRate ??= creep.body.filter(p => p.type === WORK).length * HARVEST_MINERAL_POWER;

    // Mission behavior
    const plan = roomPlans(mission.office)?.mine;
    if (!plan?.container.structure) return;

    if (!creep.memory.state || creep.store.getUsedCapacity() === 0) {
      setState(States.WITHDRAW)(creep);
    }

    if (creep.memory.state === States.WITHDRAW) {
      if (getResourcesFromMineContainer(creep, mission.office) === BehaviorResult.SUCCESS) {
        setState(States.DEPOSIT)(creep);
      }
    }
    if (creep.memory.state === States.DEPOSIT) {
      mission.efficiency.working += 1;
      // Try to deposit to Terminal, or else Storage
      // const storage = roomPlans(mission.office)?.headquarters?.storage;
      const terminal = roomPlans(mission.office)?.headquarters?.terminal;
      const res = Object.keys(creep.store)[0] as ResourceConstant | undefined;
      if (!res) {
        setState(States.WITHDRAW)(creep);
        return;
      }
      if (!terminal) return;

      if (terminal.structure && (terminal.structure as StructureTerminal).store.getFreeCapacity() > 100000) {
        moveTo(creep, { pos: terminal.pos, range: 1 });
        creep.transfer(terminal.structure, res);
      } else {
        creep.drop(res);
      } //else if (storage.structure) {
      //     if (moveTo(storage.pos, 1)(creep) === BehaviorResult.SUCCESS) {
      //         creep.transfer(storage.structure, res);
      //     }
      // } else if (isPositionWalkable(storage.pos)) {
      //     // Drop at storage position
      //     if (moveTo(storage.pos, 0)(creep) === BehaviorResult.SUCCESS) {
      //         creep.drop(res);
      //     }
      // } else {
      //     // Drop next to storage under construction
      //     if (moveTo(storage.pos, 1)(creep) === BehaviorResult.SUCCESS) {
      //         creep.drop(res);
      //     }
      // }
    }
  }
}
