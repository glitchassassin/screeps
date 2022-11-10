import { BehaviorResult } from 'Behaviors/Behavior';
import { getBoosted } from 'Behaviors/getBoosted';
import { getResourcesFromMineContainer } from 'Behaviors/getResourcesFromMineContainer';
import { recycle } from 'Behaviors/recycle';
import { runStates } from 'Behaviors/stateMachine';
import { States } from 'Behaviors/states';
import { MinionBuilders, MinionTypes } from 'Minions/minionTypes';
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
import { roomPlans } from 'Selectors/roomPlans';

export interface MineMissionData extends BaseMissionData {
  mineral: Id<Mineral>;
  distance?: number;
}

export class MineMission extends MissionImplementation {
  public creeps = {
    miner: new CreepSpawner('m', this.missionData.office, {
      role: MinionTypes.FOREMAN,
      budget: Budget.SURPLUS,
      body: energy => MinionBuilders[MinionTypes.FOREMAN](energy)
    }),
    hauler: new CreepSpawner('h', this.missionData.office, {
      role: MinionTypes.ACCOUNTANT,
      budget: Budget.SURPLUS,
      body: energy => MinionBuilders[MinionTypes.ACCOUNTANT](energy)
    })
  };

  priority = 7;

  constructor(public missionData: MineMissionData, id?: string) {
    super(missionData, id);
  }
  static fromId(id: MineMission['id']) {
    return super.fromId(id) as MineMission;
  }

  run(creeps: ResolvedCreeps<MineMission>, missions: ResolvedMissions<MineMission>, data: MineMissionData) {
    const { miner, hauler } = creeps;
    if (this.creeps.miner.died && this.creeps.hauler.died) {
      this.status = MissionStatus.DONE;
    }
    const plan = roomPlans(data.office)?.mine;
    const mine = byId(data.mineral);
    const extractor = plan?.extractor.structure;
    if (!plan || !mine || !extractor) {
      this.status = MissionStatus.DONE;
      return;
    }

    if (miner) {
      runStates(
        {
          [States.WORKING]: (data, miner) => {
            if (mine.mineralAmount === 0) return States.RECYCLE;
            // Prefer to work from container position, fall back to adjacent position
            if (!miner.pos.isEqualTo(plan.container.pos) && plan.container.pos.lookFor(LOOK_CREEPS).length === 0) {
              moveTo(miner, { pos: plan.container.pos, range: 0 });
            } else if (!miner.pos.isNearTo(mine.pos!)) {
              moveTo(miner, { pos: mine.pos, range: 1 });
            }

            miner.harvest(mine);

            return States.WORKING;
          },
          [States.GET_BOOSTED]: (data, miner) => {
            if (getBoosted(miner, data.office) === BehaviorResult.INPROGRESS) {
              return States.WORKING;
            }
            return States.GET_BOOSTED;
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
  }
}
