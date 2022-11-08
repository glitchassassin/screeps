import { deposit } from 'Behaviors/Labs/deposit';
import { emptyLabs } from 'Behaviors/Labs/emptyLabs';
import { fillLabs } from 'Behaviors/Labs/fillLabs';
import { withdrawResourcesFromTerminal } from 'Behaviors/Labs/withdrawResources';
import { recycle } from 'Behaviors/recycle';
import { runStates } from 'Behaviors/stateMachine';
import { States } from 'Behaviors/states';
import { MinionBuilders, MinionTypes } from 'Minions/minionTypes';
import { ConditionalCreepSpawner } from 'Missions/BaseClasses/CreepSpawner/ConditionalCreepSpawner';
import {
  BaseMissionData,
  MissionImplementation,
  ResolvedCreeps,
  ResolvedMissions
} from 'Missions/BaseClasses/MissionImplementation';
import { Budget } from 'Missions/Budgets';
import { moveTo } from 'screeps-cartographer';
import { getLabs } from 'Selectors/getLabs';
import { ingredientsNeededForLabOrder } from 'Selectors/ingredientsNeededForLabOrder';
import { labsShouldBeEmptied } from 'Selectors/labsShouldBeEmptied';
import { roomPlans } from 'Selectors/roomPlans';
import { boostLabsToFill, boostsNeededForLab, shouldHandleBoosts } from 'Selectors/shouldHandleBoosts';
import { LabMineralConstant, LabOrder } from 'Structures/Labs/LabOrder';
import { boostLabsToEmpty, reactionLabsToEmpty } from 'Structures/Labs/labsToEmpty';

export interface ScienceMissionData extends BaseMissionData {
  scienceIngredients?: ResourceConstant[];
  scienceProduct?: ResourceConstant;
}

export class ScienceMission extends MissionImplementation {
  public creeps = {
    scientist: new ConditionalCreepSpawner('s', this.missionData.office, {
      role: MinionTypes.ACCOUNTANT,
      budget: Budget.SURPLUS,
      body: energy => MinionBuilders[MinionTypes.ACCOUNTANT](energy),
      shouldSpawn: () =>
        Boolean(
          Memory.offices[this.missionData.office].lab.orders.length !== 0 &&
            Memory.offices[this.missionData.office].lab.boosts.length !== 0
        )
    })
  };

  priority = 9;

  constructor(public missionData: ScienceMissionData, id?: string) {
    super(missionData, id);
  }
  static fromId(id: ScienceMission['id']) {
    return super.fromId(id) as ScienceMission;
  }

  run(creeps: ResolvedCreeps<ScienceMission>, missions: ResolvedMissions<ScienceMission>, data: ScienceMissionData) {
    const { scientist } = creeps;
    if (!scientist) return;

    const terminal = roomPlans(data.office)?.headquarters?.terminal.structure as StructureTerminal | undefined;
    if (!terminal) return;

    const order = Memory.offices[data.office].lab.orders.find(o => o.amount > 0) as LabOrder | undefined;

    const boosting = shouldHandleBoosts(data.office);

    if ((scientist.ticksToLive ?? 1500) < 200) {
      scientist.memory.runState = States.RECYCLE;
    } else if (
      (boosting && boostLabsToEmpty(data.office).length > 0) ||
      (!boosting && labsShouldBeEmptied(data.office) && scientist.store.getUsedCapacity() === 0)
    ) {
      scientist.memory.runState = States.EMPTY_LABS;
    } else if (!scientist.memory.state) {
      scientist.memory.runState = States.DEPOSIT;
    }

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
            return emptyLabs({ ...data, labs: reactionLabsToEmpty(data.office) }, creep);
          }
        },
        [States.FILL_LABS]: (data, creep) => {
          if (boosting) {
            return fillLabs(
              {
                fillOrders: boostLabsToFill(data.office)
                  .map(lab => {
                    const [resource, amount] = boostsNeededForLab(data.office, lab.id);
                    return [lab, resource, amount];
                  })
                  .filter((order): order is [StructureLab, LabMineralConstant, number] => Boolean(order[1] && order[2]))
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
  }
}
