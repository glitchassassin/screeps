import { recycle } from 'Behaviors/recycle';
import { runStates } from 'Behaviors/stateMachine';
import { setState, States } from 'Behaviors/states';
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
import { getLabs } from 'Selectors/getLabs';
import { ingredientsNeededForLabOrder } from 'Selectors/ingredientsNeededForLabOrder';
import { labsShouldBeEmptied } from 'Selectors/labsShouldBeEmptied';
import { roomPlans } from 'Selectors/roomPlans';
import {
  boostLabsToEmpty,
  boostLabsToFill,
  boostsNeededForLab,
  shouldHandleBoosts
} from 'Selectors/shouldHandleBoosts';
import { getAvailableResourcesFromTerminal, getLabOrderDependencies } from 'Structures/Labs/getLabOrderDependencies';
import { LabOrder } from 'Structures/Labs/LabOrder';

export interface ScienceMissionData extends BaseMissionData {
  scienceIngredients?: ResourceConstant[];
  scienceProduct?: ResourceConstant;
}

export class ScienceMission extends MissionImplementation {
  public creeps = {
    scientist: new CreepSpawner('s', this.missionData.office, {
      role: MinionTypes.ACCOUNTANT,
      budget: Budget.SURPLUS,
      body: energy => MinionBuilders[MinionTypes.ACCOUNTANT](energy),
      respawn: () => true
    })
  };

  priority = 9;

  constructor(public missionData: ScienceMissionData, id?: string) {
    super(missionData, id);
  }
  static fromId(id: ScienceMission['id']) {
    return new this(Memory.missions[id].data, id);
  }

  run(creeps: ResolvedCreeps<ScienceMission>, missions: ResolvedMissions<ScienceMission>, data: ScienceMissionData) {
    const { scientist } = creeps;
    if (!scientist) return;

    const terminal = roomPlans(data.office)?.headquarters?.terminal.structure as StructureTerminal | undefined;
    if (!terminal) return;

    const order = Memory.offices[data.office].lab.orders.find(o => o.amount > 0) as LabOrder | undefined;

    const boosting = shouldHandleBoosts(data.office);

    if ((scientist.ticksToLive ?? 1500) < 200) {
      setState(States.RECYCLE)(scientist);
    } else if (
      (boosting && boostLabsToEmpty(data.office).length > 0) ||
      (!boosting && labsShouldBeEmptied(data.office) && scientist.store.getUsedCapacity() === 0)
    ) {
      setState(States.EMPTY_LABS)(scientist);
    } else if (!scientist.memory.state) {
      setState(States.DEPOSIT)(scientist);
    }

    runStates(
      {
        [States.DEPOSIT]: (data, creep) => {
          if (creep.store.getUsedCapacity() === 0) {
            return States.WITHDRAW;
          }
          moveTo(creep, { pos: terminal.pos, range: 1 });
          const toDeposit = Object.keys(creep.store)[0] as ResourceConstant | undefined;
          if (!toDeposit) {
            // Nothing further to deposit
            return States.WITHDRAW;
          }
          creep.transfer(terminal, toDeposit);
          if (order && toDeposit === order.output) {
            // Decrement output from the lab order
            order.amount -= creep.store.getUsedCapacity(toDeposit);
          }
          return States.DEPOSIT;
        },
        [States.WITHDRAW]: (data, creep) => {
          if (boosting) {
            moveTo(creep, { pos: terminal.pos, range: 1 });
            if (creep.pos.inRangeTo(terminal, 1)) {
              if (creep.store.getFreeCapacity() > 0) {
                for (const lab of boostLabsToFill(data.office)) {
                  let [resource, needed] = boostsNeededForLab(
                    data.office,
                    lab.structureId as Id<StructureLab> | undefined
                  );
                  if (!resource || !needed || needed <= 0 || !terminal.store.getUsedCapacity(resource)) continue;
                  // Need to get some of this resource
                  creep.withdraw(
                    terminal,
                    resource,
                    Math.min(needed, creep.store.getFreeCapacity(), terminal.store.getUsedCapacity(resource))
                  );
                  return States.WITHDRAW;
                }
                // No more resources to get
                return States.FILL_LABS;
              } else {
                return States.FILL_LABS;
              }
            }
          } else if (order) {
            const { ingredient1, ingredient2 } = ingredientsNeededForLabOrder(data.office, order, [scientist]);

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
              ingredient1 + ingredient2 === 0 &&
              creep.store.getUsedCapacity(order.ingredient1) + creep.store.getUsedCapacity(order.ingredient2) === 0
            ) {
              // No more ingredients needed; just empty labs of product
              return States.EMPTY_LABS;
            } else if (
              creep.store.getUsedCapacity(order.ingredient1) >= target1 &&
              creep.store.getUsedCapacity(order.ingredient2) >= target2
            ) {
              // Creep is already full of ingredients
              return States.FILL_LABS;
            } else {
              moveTo(creep, { pos: terminal.pos, range: 1 });
              if (creep.pos.inRangeTo(terminal, 1)) {
                if (target1 > 0 && creep.withdraw(terminal, order.ingredient1, target1) === OK) {
                  return States.WITHDRAW; // Ingredients withdrawn
                } else if (target2 > 0 && creep.withdraw(terminal, order.ingredient2, target2) === OK) {
                  return States.WITHDRAW; // Ingredients withdrawn
                } else if (target1 > 0 || target2 > 0) {
                  // No ingredients available, recalculate lab orders
                  const orders = Memory.offices[data.office].lab.orders;
                  const targetOrder = orders[orders.length - 1];
                  try {
                    Memory.offices[data.office].lab.orders = getLabOrderDependencies(
                      targetOrder,
                      getAvailableResourcesFromTerminal(terminal)
                    ).concat(targetOrder);
                  } catch {
                    // No resources for this job
                    Memory.offices[data.office].lab.orders = [];
                  }
                  // if (data.office === 'W7S7') console.log('Recalculating order', JSON.stringify(Memory.offices[data.office].lab.orders))
                  return States.WITHDRAW;
                } else {
                  // No ingredients needed, or no more available
                  return States.FILL_LABS;
                }
              }
            }
          }
          return States.WITHDRAW;
        },
        [States.EMPTY_LABS]: (data, creep) => {
          if (boosting) {
            const target = boostLabsToEmpty(data.office)[0];
            const resource = (target?.structure as StructureLab | undefined)?.mineralType;
            if (!target?.structure || !resource || creep.store.getFreeCapacity() === 0) {
              return States.DEPOSIT;
            }
            moveTo(creep, { pos: target.pos, range: 1 });
            creep.withdraw(target.structure, resource);
            return States.EMPTY_LABS;
          } else {
            // console.log(creep.name, 'emptying');
            const { inputs, outputs } = getLabs(data.office);
            const nextOutputLab = outputs.map(s => s.structure).find(s => !!(s as StructureLab)?.mineralType) as
              | StructureLab
              | undefined;
            const outputLabIngredient = nextOutputLab?.mineralType;
            const [lab1, lab2] = inputs.map(s => s.structure) as (StructureLab | undefined)[];
            const lab1Ingredient = lab1?.mineralType;
            const lab2Ingredient = lab2?.mineralType;

            // if (data.office === 'W6N8') console.log(data.office, 'EMPTY_LABS', outputLabIngredient, lab1Ingredient, lab2Ingredient)

            if (nextOutputLab && outputLabIngredient && creep.store.getFreeCapacity() > 0) {
              moveTo(creep, { pos: nextOutputLab.pos, range: 1 });
              creep.withdraw(nextOutputLab, outputLabIngredient);
              return States.EMPTY_LABS; // Getting available product
            } else if (
              lab1 &&
              lab1Ingredient &&
              lab1Ingredient !== order?.ingredient1 &&
              creep.store.getFreeCapacity() > 0
            ) {
              moveTo(creep, { pos: lab1.pos, range: 1 });
              creep.withdraw(lab1, lab1Ingredient);
              return States.EMPTY_LABS; // Getting available product
            } else if (
              lab2 &&
              lab2Ingredient &&
              lab2Ingredient !== order?.ingredient2 &&
              creep.store.getFreeCapacity() > 0
            ) {
              moveTo(creep, { pos: lab2.pos, range: 1 });
              creep.withdraw(lab2, lab2Ingredient);
              return States.EMPTY_LABS; // Getting available product
            } else {
              // No further ingredients or product to transfer, return to Storage
              return States.DEPOSIT;
            }
          }
        },
        [States.FILL_LABS]: (data, creep) => {
          if (boosting) {
            const target = boostLabsToFill(data.office).find(lab => {
              const [resource] = boostsNeededForLab(data.office, lab.structureId as Id<StructureLab> | undefined);
              return creep.store.getUsedCapacity(resource) > 0;
            });

            if (!target?.structure) {
              return States.DEPOSIT;
            }
            const [resource, amount] = boostsNeededForLab(
              data.office,
              target.structureId as Id<StructureLab> | undefined
            );
            if (!resource || !amount) {
              return States.DEPOSIT;
            }
            moveTo(creep, { pos: target.pos, range: 1 });
            creep.transfer(target.structure, resource, Math.min(amount, creep.store.getUsedCapacity(resource)));
          } else if (order) {
            // console.log(creep.name, 'filling');
            const { inputs, outputs } = getLabs(data.office);
            const [lab1, lab2] = inputs.map(s => s.structure) as (StructureLab | undefined)[];
            const nextOutputLab = outputs
              .map(s => s.structure)
              .find(s => ((s as StructureLab)?.store.getUsedCapacity(order.output) ?? 0) > 100) as
              | StructureLab
              | undefined;

            // if (data.office === 'W8N2') console.log(data.office, 'fill_labs', order.ingredient1, creep.store.getUsedCapacity(order.ingredient1), order.ingredient2, creep.store.getUsedCapacity(order.ingredient2))
            // if (data.office === 'W8N2') console.log(data.office, 'fill_labs', lab1?.store.getFreeCapacity(order.ingredient1), lab2?.store.getFreeCapacity(order.ingredient2))

            if (
              lab1 &&
              (lab1?.store.getFreeCapacity(order.ingredient1) ?? 0) > 0 &&
              creep.store.getUsedCapacity(order.ingredient1) > 0
            ) {
              moveTo(creep, { pos: lab1.pos, range: 1 });
              creep.transfer(lab1, order.ingredient1);
              return States.FILL_LABS; // Ingredients deposited
            } else if (
              lab2 &&
              (lab2?.store.getFreeCapacity(order.ingredient2) ?? 0) > 0 &&
              creep.store.getUsedCapacity(order.ingredient2) > 0
            ) {
              moveTo(creep, { pos: lab2.pos, range: 1 });
              creep.transfer(lab2, order.ingredient2);
              return States.FILL_LABS; // Ingredients deposited
            } else if (nextOutputLab && creep.store.getFreeCapacity() > 0) {
              moveTo(creep, { pos: nextOutputLab.pos, range: 1 });
              creep.withdraw(nextOutputLab, order.output);
              return States.FILL_LABS; // Getting available product
            } else {
              // No further ingredients or product to transfer, return to Storage
              return States.DEPOSIT;
            }
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
