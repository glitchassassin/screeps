import { MinionBuilders, MinionTypes } from 'Minions/minionTypes';
import { CreepSpawner } from 'Missions/BaseClasses/CreepSpawner/CreepSpawner';
import {
  BaseMissionData,
  MissionImplementation,
  ResolvedCreeps,
  ResolvedMissions
} from 'Missions/BaseClasses/MissionImplementation';
import { Budget } from 'Missions/Budgets';
import { moveTo } from 'screeps-cartographer';
import { hasEnergyIncome } from 'Selectors/hasEnergyIncome';
import { defaultRoomCallback } from 'Selectors/Map/Pathing';
import { rcl } from 'Selectors/rcl';
import { getSpawns, roomPlans } from 'Selectors/roomPlans';
import { viz } from 'Selectors/viz';
import { unpackPos } from 'utils/packrat';

export interface FastfillerMissionData extends BaseMissionData {
  refillSquares: {
    topLeft: string;
    topRight: string;
    bottomLeft: string;
    bottomRight: string;
  };
}

const fastfillerSpawner = (office: string, id: string) =>
  new CreepSpawner(id, office, {
    role: MinionTypes.CLERK,
    budget: Budget.ESSENTIAL,
    body: energy =>
      MinionBuilders[MinionTypes.CLERK](
        energy,
        (SPAWN_ENERGY_CAPACITY + EXTENSION_ENERGY_CAPACITY[rcl(office)]) / CARRY_CAPACITY,
        getSpawns(office).length !== 3
      ),
    respawn: () => hasEnergyIncome(office)
  });

export class FastfillerMission extends MissionImplementation {
  public creeps = {
    topLeft: fastfillerSpawner(this.missionData.office, 'a'),
    topRight: fastfillerSpawner(this.missionData.office, 'b'),
    bottomLeft: fastfillerSpawner(this.missionData.office, 'c'),
    bottomRight: fastfillerSpawner(this.missionData.office, 'd')
  };

  priority = 15;

  constructor(public missionData: FastfillerMissionData, id?: string) {
    super(missionData, id);
  }
  static fromId(id: FastfillerMission['id']) {
    return super.fromId(id) as FastfillerMission;
  }

  run(
    creeps: ResolvedCreeps<FastfillerMission>,
    missions: ResolvedMissions<FastfillerMission>,
    data: FastfillerMissionData
  ) {
    const { topLeft, topRight, bottomLeft, bottomRight } = creeps;

    const plan = roomPlans(data.office)?.fastfiller;
    const structures = {
      topLeft: {
        spawn: plan?.spawns[0].structure,
        container: plan?.containers[0].structure,
        oppositeContainer: plan?.containers[1].structure,
        extensions: [0, 3, 4, 6].map(i => plan?.extensions[i].structure),
        centerExtension: plan?.extensions[7].structure
      },
      bottomLeft: {
        spawn: plan?.spawns[2].structure,
        container: plan?.containers[0].structure,
        oppositeContainer: plan?.containers[1].structure,
        extensions: [1, 2, 4, 5].map(i => plan?.extensions[i].structure),
        centerExtension: plan?.extensions[8].structure
      },
      topRight: {
        spawn: plan?.spawns[1].structure,
        container: plan?.containers[1].structure,
        oppositeContainer: plan?.containers[0].structure,
        extensions: [9, 12, 6, 10].map(i => plan?.extensions[i].structure),
        centerExtension: plan?.extensions[7].structure
      },
      bottomRight: {
        spawn: plan?.spawns[2].structure,
        container: plan?.containers[1].structure,
        oppositeContainer: plan?.containers[0].structure,
        extensions: [11, 13, 14, 10].map(i => plan?.extensions[i].structure),
        centerExtension: plan?.extensions[8].structure
      }
    };
    const link = plan?.link.structure;

    const positions = [
      { creep: topLeft, pos: unpackPos(data.refillSquares.topLeft), structures: structures.topLeft },
      { creep: topRight, pos: unpackPos(data.refillSquares.topRight), structures: structures.topRight },
      { creep: bottomLeft, pos: unpackPos(data.refillSquares.bottomLeft), structures: structures.bottomLeft },
      { creep: bottomRight, pos: unpackPos(data.refillSquares.bottomRight), structures: structures.bottomRight }
    ];

    const shouldTransfer = (s: AnyStoreStructure | undefined) =>
      s && s.store[RESOURCE_ENERGY] < s.store.getCapacity(RESOURCE_ENERGY);

    for (const { creep, pos, structures } of positions) {
      if (!creep) continue;
      if (creep)
        moveTo(
          creep,
          { pos, range: 0 },
          { roomCallback: defaultRoomCallback({ ignoreFastfiller: true }), visualizePathStyle: {} }
        ); // even if already there, this will prevent shoving
      if (!creep.pos.isEqualTo(pos)) continue; // wait to get to position

      // do any adjacent structures need energy?
      const adjacentStructuresNeedEnergy =
        shouldTransfer(structures.spawn) ||
        structures.extensions.some(shouldTransfer) ||
        shouldTransfer(structures.centerExtension);
      const adjacentContainerNeedsEnergy = shouldTransfer(structures.container);
      const transferFromOpposite =
        structures.oppositeContainer &&
        structures.container &&
        structures.container.store[RESOURCE_ENERGY] <
          structures.oppositeContainer.store[RESOURCE_ENERGY] - EXTENSION_ENERGY_CAPACITY[rcl(data.office)];
      if (!adjacentStructuresNeedEnergy && !adjacentContainerNeedsEnergy) continue;

      if (creep.store.getFreeCapacity(RESOURCE_ENERGY)) {
        // Look for source
        let source;
        if (link?.store[RESOURCE_ENERGY]) {
          source = link;
        } else if (structures.centerExtension?.store[RESOURCE_ENERGY] && transferFromOpposite) {
          source = structures.centerExtension;
        } else if (structures.container?.store[RESOURCE_ENERGY] && adjacentStructuresNeedEnergy) {
          source = structures.container;
        }
        if (source) {
          creep.withdraw(source, RESOURCE_ENERGY);
          viz(creep.pos.roomName).line(creep.pos, source.pos, { color: 'red' });
          source.store[RESOURCE_ENERGY] = Math.max(
            0,
            source.store[RESOURCE_ENERGY] - creep.store.getFreeCapacity(RESOURCE_ENERGY)
          );
        }
      }

      if (creep.store.getUsedCapacity(RESOURCE_ENERGY)) {
        let destination = [
          structures.spawn,
          ...structures.extensions,
          !transferFromOpposite ? structures.centerExtension : undefined,
          structures.container
        ].find(shouldTransfer);

        if (destination) {
          creep.transfer(destination, RESOURCE_ENERGY);
          viz(creep.pos.roomName).line(creep.pos, destination.pos, { color: 'green' });
          destination.store[RESOURCE_ENERGY] = Math.min(
            destination.store.getCapacity(RESOURCE_ENERGY),
            destination.store[RESOURCE_ENERGY] + creep.store.getFreeCapacity(RESOURCE_ENERGY)
          );
        }
      }
    }
  }
}
