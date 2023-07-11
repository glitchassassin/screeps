import { recycle } from 'Behaviors/recycle';
import { runStates } from 'Behaviors/stateMachine';
import { States } from 'Behaviors/states';
import { buildAccountant } from 'Minions/Builds/accountant';
import { MinionTypes } from 'Minions/minionTypes';
import { ConditionalCreepSpawner } from 'Missions/BaseClasses/CreepSpawner/ConditionalCreepSpawner';
import {
  BaseMissionData,
  MissionImplementation,
  ResolvedCreeps,
  ResolvedMissions
} from 'Missions/BaseClasses/MissionImplementation';
import { Budget } from 'Missions/Budgets';
import { moveTo } from 'screeps-cartographer';
import { byId } from 'Selectors/byId';
import { hasEnergyIncome } from 'Selectors/hasEnergyIncome';
import { getClosestByRange } from 'Selectors/Map/MapCoordinates';
import { roomPlans } from 'Selectors/roomPlans';
import { memoizeOncePerTick } from 'utils/memoizeFunction';

export interface CleanupMissionData extends BaseMissionData {
  target?: Id<AnyStoreStructure>;
}

export class CleanupMission extends MissionImplementation {
  public creeps = {
    janitor: new ConditionalCreepSpawner('j', this.missionData.office, {
      role: MinionTypes.ACCOUNTANT,
      budget: Budget.ESSENTIAL,
      builds: energy => buildAccountant(energy, 5),
      shouldSpawn: () => hasEnergyIncome(this.missionData.office) && this.misplacedResources().length > 0
    })
  };

  priority = 15;

  misplacedResources = memoizeOncePerTick(() => {
    const misplaced: AnyStoreStructure[] = [];
    const plan = roomPlans(this.missionData.office);
    const checkForNonEnergyResource = ({ structure }: { structure?: AnyStoreStructure }) => {
      if (structure && Object.keys(structure.store).some(k => k !== RESOURCE_ENERGY)) {
        misplaced.push(structure);
      }
    };
    plan?.fastfiller?.containers.forEach(checkForNonEnergyResource);
    checkForNonEnergyResource(plan?.franchise1?.container ?? {});
    checkForNonEnergyResource(plan?.franchise2?.container ?? {});
    checkForNonEnergyResource(plan?.headquarters?.storage ?? {});
    // non-energy resources
    return misplaced;
  });

  constructor(public missionData: CleanupMissionData, id?: string) {
    super(missionData, id);
  }
  static fromId(id: CleanupMission['id']) {
    return super.fromId(id) as CleanupMission;
  }

  run(creeps: ResolvedCreeps<CleanupMission>, missions: ResolvedMissions<CleanupMission>, data: CleanupMissionData) {
    const { janitor } = creeps;
    if (!janitor) return;

    if (!data.target || !byId(data.target)) {
      data.target ??= getClosestByRange(janitor.pos, this.misplacedResources())?.id;
    }

    runStates(
      {
        [States.WITHDRAW]: (data, creep) => {
          const target = byId(data.target);
          if (!creep.store.getFreeCapacity()) return States.DEPOSIT;
          if (!target) {
            if (creep.store.getUsedCapacity()) return States.DEPOSIT;
            return States.RECYCLE;
          }
          moveTo(creep, target);
          if (creep.pos.inRangeTo(target, 1)) {
            let withdrew = false;
            for (const resource in target.store) {
              if (resource === RESOURCE_ENERGY) continue;
              if (withdrew) return States.WITHDRAW; // more to withdraw next tick
              if (creep.withdraw(target, resource as ResourceConstant) === OK) {
                creep.store[resource as ResourceConstant] = 1; // so DEPOSIT check passes
                withdrew = true;
              }
            }
            delete data.target;
            return States.DEPOSIT;
          }
          return States.WITHDRAW;
        },
        [States.DEPOSIT]: (data, creep) => {
          if (Object.keys(creep.store).length === 0) return States.WITHDRAW;
          const terminal = roomPlans(data.office)?.headquarters?.terminal;
          if (!terminal) {
            creep.drop(Object.keys(creep.store)[0] as ResourceConstant);
            return States.DEPOSIT;
          }
          moveTo(creep, terminal.pos);
          if (!creep.pos.inRangeTo(terminal.pos, 1)) return States.DEPOSIT;
          if (terminal.structure) {
            creep.transfer(terminal.structure, Object.keys(creep.store)[0] as ResourceConstant);
          } else {
            creep.drop(Object.keys(creep.store)[0] as ResourceConstant);
          }
          return States.DEPOSIT;
        },
        [States.RECYCLE]: recycle
      },
      data,
      janitor
    );

    this.logCpu("creeps");
  }
}
