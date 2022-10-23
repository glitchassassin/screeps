import { BehaviorResult } from 'Behaviors/Behavior';
import { getBoosted } from 'Behaviors/getBoosted';
import { States } from 'Behaviors/states';
import { MinionBuilders, MinionTypes } from 'Minions/minionTypes';
import { createSpawnOrder, SpawnOrder } from 'Minions/spawnQueues';
import { createMission, Mission, MissionType } from 'Missions/Mission';
import { moveTo } from 'screeps-cartographer';
import { byId } from 'Selectors/byId';
import { roomPlans } from 'Selectors/roomPlans';
import { spawnEnergyAvailable } from 'Selectors/spawnEnergyAvailable';
import { MissionImplementation } from './MissionImplementation';

export interface MineForemanMission extends Mission<MissionType.MINE_FOREMAN> {
  data: {
    mineral: Id<Mineral>;
    distance?: number;
    harvestRate: number;
  };
}

export function createMineForemanOrder(office: string, mineral: Id<Mineral>): SpawnOrder {
  const body = MinionBuilders[MinionTypes.FOREMAN](spawnEnergyAvailable(office));
  const estimate = {
    cpu: CREEP_LIFE_TIME * 0.4,
    energy: 0
  };

  const mission = createMission({
    office,
    priority: 7,
    type: MissionType.MINE_FOREMAN,
    data: {
      mineral,
      harvestRate: body.filter(t => t === WORK).length * HARVEST_MINERAL_POWER
    },
    estimate
  });

  // Set name
  const name = `FOREMAN-${mission.office}-${mission.id}`;

  return createSpawnOrder(mission, {
    name,
    body,
    memory: { state: States.GET_BOOSTED },
    boosts: [RESOURCE_UTRIUM_ALKALIDE]
  });
}

export class MineForeman extends MissionImplementation {
  static minionLogic(mission: Mission<MissionType>, creep: Creep): void {
    // Set some additional data on the mission
    mission.data.harvestRate ??= creep.body.filter(p => p.type === WORK).length * HARVEST_MINERAL_POWER;

    // Mission behavior
    if (creep.memory.state === States.GET_BOOSTED) {
      if (getBoosted(creep, mission) === BehaviorResult.INPROGRESS) {
        return;
      }
      creep.memory.state = undefined;
    }
    const mine = byId(Memory.rooms[mission.office].mineralId);
    if (!mine) return;
    const plan = roomPlans(mission.office)?.mine;
    if (!plan?.extractor.structure) return;

    // Prefer to work from container position, fall back to adjacent position
    if (!creep.pos.isEqualTo(plan.container.pos) && plan.container.pos.lookFor(LOOK_CREEPS).length === 0) {
      moveTo(creep, { pos: plan.container.pos, range: 0 });
    } else if (!creep.pos.isNearTo(mine.pos!)) {
      moveTo(creep, { pos: mine.pos, range: 1 });
    }

    if (creep.harvest(mine) === OK) {
      mission.efficiency.working += 1;
    }
  }
}
