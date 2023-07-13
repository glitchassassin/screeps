import { deposit } from 'Behaviors/Labs/deposit';
import { emptyLabs } from 'Behaviors/Labs/emptyLabs';
import { fillLabs } from 'Behaviors/Labs/fillLabs';
import { withdrawResourcesFromTerminal } from 'Behaviors/Labs/withdrawResources';
import { recycle } from 'Behaviors/recycle';
import { runStates } from 'Behaviors/stateMachine';
import { States } from 'Behaviors/states';
import { FEATURES } from 'config';
import { buildAccountant } from 'Minions/Builds/accountant';
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
import { getLabs } from 'Selectors/getLabs';
import { registerScientists } from 'Selectors/getScientists';
import { ingredientsNeededForLabOrder } from 'Selectors/ingredientsNeededForLabOrder';
import { labsShouldBeEmptied } from 'Selectors/labsShouldBeEmptied';
import { roomPlans } from 'Selectors/roomPlans';
import { boostLabsToFill, boostsNeededForLab, shouldHandleBoosts } from 'Selectors/shouldHandleBoosts';
import { getAvailableResourcesFromTerminal, getLabOrderDependencies } from 'Structures/Labs/getLabOrderDependencies';
import { LabMineralConstant, LabOrder } from 'Structures/Labs/LabOrder';
import { boostLabsToEmpty, reactionLabsToEmpty } from 'Structures/Labs/labsToEmpty';

export interface ScienceMissionData extends BaseMissionData {
  scienceIngredients?: ResourceConstant[];
  scienceProduct?: ResourceConstant;
}

export class ScienceMission extends MissionImplementation {
  public creeps = {
    scientist: new CreepSpawner('s', this.missionData.office, {
      role: MinionTypes.ACCOUNTANT,
      budget: Budget.EFFICIENCY,
      builds: energy => buildAccountant(energy, 25, true, false),
      respawn: () => ScienceMission.shouldRun(this.missionData.office),
    })
  };

  priority = 9;

  constructor(public missionData: ScienceMissionData, id?: string) {
    super(missionData, id);
  }
  static fromId(id: ScienceMission['id']) {
    return super.fromId(id) as ScienceMission;
  }

  static shouldRun(office: string) {
    return Boolean(
      FEATURES.LABS &&
      roomPlans(office)?.labs?.labs.filter(s => s.structure).length &&
      (Memory.offices[office].lab.orders.length !== 0 ||
      Memory.offices[office].lab.boosts.length !== 0)
    )
  }

  run(creeps: ResolvedCreeps<ScienceMission>, missions: ResolvedMissions<ScienceMission>, data: ScienceMissionData) {
    const { scientist } = creeps;
    if (!scientist) {
      if (!ScienceMission.shouldRun(data.office)) {
        this.status = MissionStatus.DONE;
      }
      return;
    }
    registerScientists(data.office, [scientist]);

    const terminal = roomPlans(data.office)?.headquarters?.terminal.structure as StructureTerminal | undefined;
    if (!terminal) return;

    const order = Memory.offices[data.office].lab.orders.find(o => o.amount > 0) as LabOrder | undefined;

    const boosting = shouldHandleBoosts(data.office);
    // if (boosting) console.log('boosting');

    if ((scientist.ticksToLive ?? 1500) < 200) {
      scientist.memory.runState = States.RECYCLE;
    } else if (
      (boosting && boostLabsToEmpty(data.office).length > 0) ||
      (!boosting && labsShouldBeEmptied(data.office) && scientist.store.getUsedCapacity() === 0)
    ) {
      scientist.memory.runState = States.EMPTY_LABS;
    } else if (!scientist.memory.runState) {
      scientist.memory.runState = States.DEPOSIT;
    }

    this.logCpu("overhead");

    runStates(
      {
        [States.DEPOSIT]: deposit(order),
        [States.WITHDRAW]: (data, creep) => {
          if (boosting) {
            const withdrawResources = boostLabsToFill(data.office)
              .map(lab => boostsNeededForLab(data.office, lab.id))
              .filter((request): request is [LabMineralConstant, number] => Boolean(request[0] && request[1]));
            return withdrawResourcesFromTerminal({ office: data.office, withdrawResources }, creep);
          } else if (order) {
            const { ingredient1, ingredient2 } = ingredientsNeededForLabOrder(data.office, order, []);

            if (
              ingredient1 + ingredient2 === 0 &&
              creep.store.getUsedCapacity(order.ingredient1) + creep.store.getUsedCapacity(order.ingredient2) === 0
            ) {
              // No more ingredients needed; just empty labs of product
              return States.EMPTY_LABS;
            }

            const ingredientQuantity = (i: number) => Math.min(Math.floor(creep.store.getCapacity() / 2), i);
            const target1 = Math.min(
              Math.max(0, ingredientQuantity(ingredient1) - creep.store.getUsedCapacity(order.ingredient1)),
              creep.store.getFreeCapacity()
            );
            const target2 = Math.min(
              Math.max(0, ingredientQuantity(ingredient2) - creep.store.getUsedCapacity(order.ingredient2)),
              creep.store.getFreeCapacity()
            );

            if (
              target1 > terminal.store.getUsedCapacity(order.ingredient1) ||
              target2 > terminal.store.getUsedCapacity(order.ingredient2)
            ) {
              // not enough resources in terminal - recalculate lab orders
              Memory.offices[data.office].lab.orders = getLabOrderDependencies(
                order,
                getAvailableResourcesFromTerminal(terminal)
              ).concat(order);
            }

            const withdrawResources = [
              [order.ingredient1, target1],
              [order.ingredient2, target2]
            ].filter((request): request is [LabMineralConstant, number] => Boolean(request[0] && request[1]));

            return withdrawResourcesFromTerminal({ office: data.office, withdrawResources }, creep);
          }
          return States.WITHDRAW;
        },
        [States.EMPTY_LABS]: (data, creep) => {
          if (boosting) {
            return emptyLabs({ ...data, labs: boostLabsToEmpty(data.office) }, creep);
          } else {
            const { inputs } = getLabs(data.office);
            const [lab1, lab2] = inputs.map(s => s.structure);
            // reaction is ongoing, let it pile up before emptying
            const waitForReaction =
              lab1 &&
              lab1.mineralType === order?.ingredient1 &&
              lab1.store.getUsedCapacity(lab1.mineralType) > 5 &&
              lab2 &&
              lab2.mineralType === order?.ingredient2 &&
              lab2.store.getUsedCapacity(lab2.mineralType) > 5;
            return emptyLabs({ ...data, labs: reactionLabsToEmpty(data.office), waitForReaction }, creep);
          }
        },
        [States.FILL_LABS]: (data, creep) => {
          if (boosting) {
            const fillOrders = boostLabsToFill(data.office)
              .map(lab => {
                const [resource, amount] = boostsNeededForLab(data.office, lab.id);
                return [lab, resource, amount];
              })
              .filter((order): order is [StructureLab, LabMineralConstant, number] => Boolean(order[1] && order[2]));
            return fillLabs(
              {
                fillOrders
              },
              creep
            );
          } else if (order) {
            // console.log(creep.name, 'filling');
            const { inputs } = getLabs(data.office);
            const [lab1, lab2] = inputs.map(s => s.structure);
            const { ingredient1, ingredient2 } = ingredientsNeededForLabOrder(data.office, order, []);

            return fillLabs(
              {
                fillOrders: [
                  [lab1, order.ingredient1, ingredient1],
                  [lab2, order.ingredient2, ingredient2]
                ].filter((o): o is [StructureLab, LabMineralConstant, number] => Boolean(o[0]))
              },
              creep
            );
          }
          return States.FILL_LABS;
        },
        [States.RECYCLE]: (data, creep) => {
          if (!terminal || creep.store.getUsedCapacity() === 0) {
            // Go to spawn and recycle
            return recycle(data, creep);
          } else if (terminal) {
            // deposit resources first
            moveTo(creep, { pos: terminal.pos, range: 1 });
            const toDeposit = Object.keys(creep.store)[0] as ResourceConstant | undefined;
            toDeposit && creep.transfer(terminal, toDeposit);
          }
          return States.RECYCLE;
        }
      },
      this.missionData,
      scientist
    );

    this.logCpu("creeps");
  }
}
