import { BehaviorResult } from 'Behaviors/Behavior';
import { getBoosted } from 'Behaviors/getBoosted';
import { getResourcesFromMineContainer } from 'Behaviors/getResourcesFromMineContainer';
import { recycle } from 'Behaviors/recycle';
import { runStates } from 'Behaviors/stateMachine';
import { States } from 'Behaviors/states';
import { FEATURES } from 'config';
import { bestTierAvailable } from 'Minions/bestBuildTier';
import { buildAccountant } from 'Minions/Builds/accountant';
import { buildForeman } from 'Minions/Builds/foreman';
import { MinionTypes } from 'Minions/minionTypes';
import { CreepSpawner } from 'Missions/BaseClasses/CreepSpawner/CreepSpawner';
import {
  BaseMissionData,
  MissionImplementation,
  ResolvedCreeps,
  ResolvedMissions
} from 'Missions/BaseClasses/MissionImplementation';
import { Budget } from 'Missions/Budgets';
import { MissionStatus } from 'Missions/Mission';
import { moveTo } from 'screeps-cartographer';
import { byId } from 'Selectors/byId';
import { maxBuildCost } from 'Selectors/minionCostPerTick';
import { mineralId } from 'Selectors/roomCache';
import { roomPlans } from 'Selectors/roomPlans';

export interface MineMissionData extends BaseMissionData {
  mineral: Id<Mineral>;
  distance?: number;
}

export class MineMission extends MissionImplementation {
  budget = Budget.SURPLUS;
  public creeps = {
    miner: new CreepSpawner('m', this.missionData.office, {
      role: MinionTypes.FOREMAN,
      builds: energy => bestTierAvailable(this.missionData.office, buildForeman(energy))
    }),
    hauler: new CreepSpawner('h', this.missionData.office, {
      role: MinionTypes.ACCOUNTANT,
      builds: energy => buildAccountant(energy)
    })
  };

  priority = 7;

  constructor(
    public missionData: MineMissionData,
    id?: string
  ) {
    super(missionData, id);

    const energy = Game.rooms[this.missionData.office].energyCapacityAvailable;
    this.estimatedEnergyRemaining = maxBuildCost(buildForeman(energy)) + maxBuildCost(buildAccountant(energy));
  }
  static fromId(id: MineMission['id']) {
    return super.fromId(id) as MineMission;
  }

  static shouldRun(office: string) {
    return Boolean(
      FEATURES.MINING && byId(mineralId(office))?.mineralAmount && roomPlans(office)?.mine?.extractor.structure
    );
  }

  run(creeps: ResolvedCreeps<MineMission>, missions: ResolvedMissions<MineMission>, data: MineMissionData) {
    const { miner, hauler } = creeps;
    if (this.creeps.miner.died && this.creeps.hauler.died) {
      this.status = MissionStatus.DONE;
    }
    const plan = roomPlans(data.office)?.mine;
    const mine = byId(data.mineral);
    const extractor = plan?.extractor.structure;

    this.logCpu('overhead');
    if (!plan || !mine || !extractor) {
      this.status = MissionStatus.DONE;
      return;
    }

    if (miner) {
      runStates(
        {
          [States.GET_BOOSTED]: getBoosted(States.WORKING),
          [States.WORKING]: (data, miner) => {
            if (mine.mineralAmount === 0) return States.RECYCLE;
            // Always work from container position
            moveTo(miner, { pos: plan.container.pos, range: 0 });
            if (miner.pos.isEqualTo(plan.container.pos)) {
              miner.harvest(mine);
            }

            return States.WORKING;
          },
          [States.RECYCLE]: recycle
        },
        this.missionData,
        miner
      );
    }

    if (hauler) {
      runStates(
        {
          [States.WITHDRAW]: (data, hauler) => {
            if (getResourcesFromMineContainer(hauler, data.office) === BehaviorResult.SUCCESS) {
              if (!miner && hauler.store.getUsedCapacity() === 0) {
                // all done
                return States.RECYCLE;
              }
              return States.DEPOSIT;
            }
            return States.WITHDRAW;
          },
          [States.DEPOSIT]: (data, hauler) => {
            if (hauler.store.getUsedCapacity() === 0) {
              return States.WITHDRAW;
            }
            const terminal = roomPlans(data.office)?.headquarters?.terminal;
            const res = Object.keys(hauler.store)[0] as ResourceConstant | undefined;
            if (!res) {
              return States.WITHDRAW;
            }
            if (!terminal) return States.DEPOSIT;

            if (terminal.structure && (terminal.structure as StructureTerminal).store.getFreeCapacity() > 100000) {
              moveTo(hauler, { pos: terminal.pos, range: 1 });
              hauler.transfer(terminal.structure, res);
            } else {
              hauler.drop(res);
            }
            return States.DEPOSIT;
          },
          [States.RECYCLE]: recycle
        },
        this.missionData,
        hauler
      );
    }

    this.logCpu('creeps');
  }
}
