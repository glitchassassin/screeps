import { BehaviorResult } from "Behaviors/Behavior";
import { moveTo } from "Behaviors/moveTo";
import { setState, States } from "Behaviors/states";
import { MinionBuilders, MinionTypes } from "Minions/minionTypes";
import { scheduleSpawn } from "Minions/spawnQueues";
import { createMission, Mission, MissionType } from "Missions/Mission";
import { defaultDirectionsForSpawn } from "Selectors/defaultDirectionsForSpawn";
import { getLabs } from "Selectors/getLabs";
import { getPrimarySpawn } from "Selectors/getPrimarySpawn";
import { ingredientsNeededForLabOrder } from "Selectors/ingredientsNeededForLabOrder";
import { labsShouldBeEmptied } from "Selectors/labsShouldBeEmptied";
import { minionCost } from "Selectors/minionCostPerTick";
import { roomPlans } from "Selectors/roomPlans";
import { boostLabsToEmpty, boostLabsToFill, boostsNeededForLab, shouldHandleBoosts } from "Selectors/shouldHandleBoosts";
import { spawnEnergyAvailable } from "Selectors/spawnEnergyAvailable";
import { getAvailableResourcesFromTerminal, getLabOrderDependencies } from "Structures/Labs/getLabOrderDependencies";
import { LabOrder } from "Structures/Labs/LabOrder";
import { MissionImplementation } from "./MissionImplementation";

declare global {
  interface CreepMemory {
      scienceIngredients?: ResourceConstant[]
      scienceProduct?: ResourceConstant
  }
}

export interface ScienceMission extends Mission<MissionType.SCIENCE> {
  data: {
    scienceIngredients?: ResourceConstant[]
    scienceProduct?: ResourceConstant
  }
}

export function createScienceMission(office: string, startTime?: number): ScienceMission {
  const body = MinionBuilders[MinionTypes.ACCOUNTANT](spawnEnergyAvailable(office));

  const estimate = {
    cpu: CREEP_LIFE_TIME * 0.4,
    energy: minionCost(body),
  }

  return createMission({
    office,
    priority: 9,
    type: MissionType.SCIENCE,
    data: {
    },
    estimate,
    startTime
  })
}

export class Science extends MissionImplementation {
  static spawn(mission: ScienceMission) {
    if (mission.creepNames.length) return; // only need to spawn one minion

    const spawn = roomPlans(mission.office)?.headquarters?.spawn.structure as StructureSpawn;
    if (!spawn) return;

    const directions = defaultDirectionsForSpawn(mission.office, spawn)

    // Set name
    const name = `SCIENTIST-${mission.office}-${mission.id}`
    const body = MinionBuilders[MinionTypes.ACCOUNTANT](spawnEnergyAvailable(mission.office));

    scheduleSpawn(
      mission.office,
      mission.priority,
      {
        name,
        body,
      },
      mission.startTime,
      mission.startTime ? {
        spawn: spawn.id,
        directions
      } : undefined
    )

    mission.creepNames.push(name);
  }

  static minionLogic(mission: ScienceMission, creep: Creep) {
    creep.say('🔬');
    if (shouldHandleBoosts(mission.office)) {
      this.handleBoosts(mission, creep);
    } else {
      this.handleLabOrders(mission, creep);
    }
  }

  static handleBoosts(mission: ScienceMission, creep: Creep) {
    if ((creep.ticksToLive ?? 1500) < 200) {
      setState(States.RECYCLE)(creep)
    } else if (boostLabsToEmpty(mission.office).length > 0 && creep.store.getUsedCapacity() === 0) {
      setState(States.EMPTY_LABS)(creep)
    } else if (!creep.memory.state) {
      setState(States.DEPOSIT)(creep)
    }

    const terminal = roomPlans(mission.office)?.headquarters?.terminal.structure as StructureTerminal | undefined
    if (!terminal) return;

    if (creep.memory.state === States.RECYCLE) {
      if (creep.store.getUsedCapacity() === 0) {
        // Go to spawn and recycle
        const spawn = getPrimarySpawn(mission.office);
        if (spawn && moveTo(creep, { pos: spawn.pos, range: 1 }) === BehaviorResult.SUCCESS) {
          spawn.recycleCreep(creep);
        }
      } else if (moveTo(creep, { pos: terminal.pos, range: 1 }) === BehaviorResult.SUCCESS) {
        const toDeposit = Object.keys(creep.store)[0] as ResourceConstant | undefined;
        if (toDeposit && creep.transfer(terminal, toDeposit) === OK) {
          return; // Other resources deposited
        }
      }
    }

    if (creep.memory.state === States.DEPOSIT) {
      if (creep.store.getUsedCapacity() === 0) {
        setState(States.WITHDRAW)(creep)
      }
      if (moveTo(creep, { pos: terminal.pos, range: 1 }) === BehaviorResult.SUCCESS) {
        const toDeposit = Object.keys(creep.store)[0] as ResourceConstant | undefined;
        if (toDeposit && creep.transfer(terminal, toDeposit) === OK) {
          return; // Other resources deposited
        } else {
          // Nothing further to deposit
          setState(States.WITHDRAW)(creep)
        }
      }
    }
    if (creep.memory.state === States.WITHDRAW) {
      if (moveTo(creep, { pos: terminal.pos, range: 1 }) === BehaviorResult.SUCCESS) {
        if (creep.store.getFreeCapacity() > 0) {
          for (const lab of boostLabsToFill(mission.office)) {
            let [resource, needed] = boostsNeededForLab(mission.office, lab.structureId as Id<StructureLab> | undefined);
            if (!resource || !needed || needed <= 0 || !terminal.store.getUsedCapacity(resource)) continue;
            // Need to get some of this resource
            creep.withdraw(terminal, resource, Math.min(needed, creep.store.getFreeCapacity(), terminal.store.getUsedCapacity(resource)));
            return;
          }
          // No more resources to get
          setState(States.FILL_LABS)(creep)
        } else {
          setState(States.FILL_LABS)(creep)
        }
      }
    }
    if (creep.memory.state === States.EMPTY_LABS) {
      const target = boostLabsToEmpty(mission.office)[0];
      const resource = (target?.structure as StructureLab | undefined)?.mineralType
      if (!target?.structure || !resource || creep.store.getFreeCapacity() === 0) {
        setState(States.DEPOSIT)(creep);
        return;
      }
      if (moveTo(creep, { pos: target.pos, range: 1 }) === BehaviorResult.SUCCESS) {
        creep.withdraw(target.structure, resource);
      }
    }
    if (creep.memory.state === States.FILL_LABS) {
      const target = boostLabsToFill(mission.office).find(lab => {
        const [resource] = boostsNeededForLab(mission.office, lab.structureId as Id<StructureLab> | undefined);
        return creep.store.getUsedCapacity(resource) > 0;
      })

      if (!target?.structure) {
        setState(States.DEPOSIT)(creep);
        return;
      }
      const [resource, amount] = boostsNeededForLab(mission.office, target.structureId as Id<StructureLab> | undefined);
      if (!resource || !amount) {
        setState(States.DEPOSIT)(creep);
        return;
      }
      if (moveTo(creep, { pos: target.pos, range: 1 }) === BehaviorResult.SUCCESS) {
        creep.transfer(target.structure, resource, Math.min(amount, creep.store.getUsedCapacity(resource)));
      }
    }
  }

  static handleLabOrders(mission: ScienceMission, creep: Creep) {
    const order = Memory.offices[mission.office].lab.orders.find(o => o.amount > 0) as LabOrder | undefined;

    if ((creep.ticksToLive ?? 1500) < 200) {
      setState(States.RECYCLE)(creep)
    } else if (labsShouldBeEmptied(mission.office) && creep.store.getFreeCapacity() > 0) {
      setState(States.EMPTY_LABS)(creep)
    } else if (!creep.memory.state) {
      setState(States.DEPOSIT)(creep)
    }
    const terminal = roomPlans(mission.office)?.headquarters?.terminal.structure

    if (creep.memory.state === States.RECYCLE) {
      // console.log(creep.name, 'recycling');
      if (creep.store.getUsedCapacity() === 0) {
        // Go to spawn and recycle
        const spawn = getPrimarySpawn(mission.office);
        if (spawn && moveTo(creep, { pos: spawn.pos, range: 1 }) === BehaviorResult.SUCCESS) {
          spawn.recycleCreep(creep);
        }
      } else if (terminal && moveTo(creep, { pos: terminal.pos, range: 1 }) === BehaviorResult.SUCCESS) {
        const toDeposit = Object.keys(creep.store)[0] as ResourceConstant | undefined;
        if (toDeposit && creep.transfer(terminal, toDeposit) === OK) {
          return; // Other resources deposited
        }
      }
    }
    if (creep.memory.state === States.DEPOSIT) {
      if (!terminal) return;
      const result = moveTo(creep, { pos: terminal.pos, range: 1 });
      // console.log(creep.name, 'depositing', creep.pos, terminal.pos, result);
      if (result === BehaviorResult.SUCCESS) {
        const toDeposit = Object.keys(creep.store)[0] as ResourceConstant | undefined;
        if (toDeposit && creep.transfer(terminal, toDeposit) === OK) {
          if (order && toDeposit === order.output) {
            // Decrement output from the lab order
            order.amount -= creep.store.getUsedCapacity(toDeposit);
          }
          return; // Other resources deposited
        } else if (labsShouldBeEmptied(mission.office)) {
          setState(States.EMPTY_LABS)(creep)
        } else {
          // Nothing further to deposit
          setState(States.WITHDRAW)(creep)
        }
      }
    }
    if (order && creep.memory.state === States.WITHDRAW) {
      // console.log(creep.name, 'withdrawing');
      const terminal = roomPlans(mission.office)?.headquarters?.terminal.structure as StructureTerminal | undefined
      if (!terminal) return;
      const { ingredient1, ingredient2 } = ingredientsNeededForLabOrder(mission.office, order);

      const ingredientQuantity = (i: number) => Math.min(Math.floor(creep.store.getCapacity() / 2), i)
      const target1 = Math.min(
        Math.max(0, ingredientQuantity(ingredient1) - creep.store.getUsedCapacity(order.ingredient1)),
        creep.store.getFreeCapacity(),
        // terminal.store.getUsedCapacity(order.ingredient1)=
      );
      const target2 = Math.min(
        Math.max(0, ingredientQuantity(ingredient2) - creep.store.getUsedCapacity(order.ingredient2)),
        creep.store.getFreeCapacity(),
        // terminal.store.getUsedCapacity(order.ingredient2)
      );

      // if (mission.office === 'W7S7') console.log(mission.office, 'withdraw', order.ingredient1, ingredient1, target1, order.ingredient2, ingredient2, target2)

      if (
        ingredient1 + ingredient2 === 0 &&
        creep.store.getUsedCapacity(order.ingredient1) + creep.store.getUsedCapacity(order.ingredient2) === 0
      ) {
        // No more ingredients needed; just empty labs of product
        setState(States.EMPTY_LABS)(creep)
      } else if (creep.store.getUsedCapacity(order.ingredient1) >= target1 && creep.store.getUsedCapacity(order.ingredient2) >= target2) {
        // Creep is already full of ingredients
        setState(States.FILL_LABS)(creep)
      } else if (moveTo(creep, { pos: terminal.pos, range: 1 }) === BehaviorResult.SUCCESS) {
        if (target1 > 0 && creep.withdraw(terminal, order.ingredient1, target1) === OK) {
          return; // Ingredients withdrawn
        } else if (target2 > 0 && creep.withdraw(terminal, order.ingredient2, target2) === OK) {
          return; // Ingredients withdrawn
        } else if (target1 > 0 || target2 > 0) {
          // No ingredients available, recalculate lab orders
          const orders = Memory.offices[mission.office].lab.orders;
          const targetOrder = orders[orders.length - 1]
          try {
            Memory.offices[mission.office].lab.orders = getLabOrderDependencies(
              targetOrder,
              getAvailableResourcesFromTerminal(terminal)
            ).concat(targetOrder);
          } catch {
            // No resources for this job
            Memory.offices[mission.office].lab.orders = [];
          }
          // if (mission.office === 'W7S7') console.log('Recalculating order', JSON.stringify(Memory.offices[mission.office].lab.orders))
          return;
        } else {
          // No ingredients needed, or no more available
          setState(States.FILL_LABS)(creep)
        }
      }
    }
    if (order && creep.memory.state === States.FILL_LABS) {
      // console.log(creep.name, 'filling');
      const { inputs, outputs } = getLabs(mission.office);
      const [lab1, lab2] = inputs.map(s => s.structure) as (StructureLab | undefined)[];
      const nextOutputLab = outputs.map(s => s.structure).find(s => ((s as StructureLab)?.store.getUsedCapacity(order.output) ?? 0) > 100) as StructureLab | undefined;

      // if (mission.office === 'W8N2') console.log(mission.office, 'fill_labs', order.ingredient1, creep.store.getUsedCapacity(order.ingredient1), order.ingredient2, creep.store.getUsedCapacity(order.ingredient2))
      // if (mission.office === 'W8N2') console.log(mission.office, 'fill_labs', lab1?.store.getFreeCapacity(order.ingredient1), lab2?.store.getFreeCapacity(order.ingredient2))

      if (lab1 && (lab1?.store.getFreeCapacity(order.ingredient1) ?? 0) > 0 && creep.store.getUsedCapacity(order.ingredient1) > 0) {
        if (moveTo(creep, { pos: lab1.pos, range: 1 }) === BehaviorResult.SUCCESS) {
          creep.transfer(lab1, order.ingredient1)
        }
        return; // Ingredients deposited
      } else if (lab2 && (lab2?.store.getFreeCapacity(order.ingredient2) ?? 0) > 0 && creep.store.getUsedCapacity(order.ingredient2) > 0) {
        if (moveTo(creep, { pos: lab2.pos, range: 1 }) === BehaviorResult.SUCCESS) {
          creep.transfer(lab2, order.ingredient2)
        }
        return; // Ingredients deposited
      } else if (nextOutputLab && creep.store.getFreeCapacity() > 0) {
        if (moveTo(creep, { pos: nextOutputLab.pos, range: 1 }) === BehaviorResult.SUCCESS) {
          creep.withdraw(nextOutputLab, order.output)
        }
        return; // Getting available product
      } else {
        // No further ingredients or product to transfer, return to Storage
        setState(States.DEPOSIT)(creep)
      }
    }
    if (creep.memory.state === States.EMPTY_LABS) {
      // console.log(creep.name, 'emptying');
      const { inputs, outputs } = getLabs(mission.office);
      const nextOutputLab = outputs.map(s => s.structure).find(s => !!(s as StructureLab)?.mineralType) as StructureLab | undefined;
      const outputLabIngredient = nextOutputLab?.mineralType;
      const [lab1, lab2] = inputs.map(s => s.structure) as (StructureLab | undefined)[];
      const lab1Ingredient = lab1?.mineralType;
      const lab2Ingredient = lab2?.mineralType;

      // if (mission.office === 'W6N8') console.log(mission.office, 'EMPTY_LABS', outputLabIngredient, lab1Ingredient, lab2Ingredient)

      if (nextOutputLab && outputLabIngredient && creep.store.getFreeCapacity() > 0) {
        if (moveTo(creep, { pos: nextOutputLab.pos, range: 1 }) === BehaviorResult.SUCCESS) {
          creep.withdraw(nextOutputLab, outputLabIngredient)
        }
        return; // Getting available product
      } else if (lab1 && lab1Ingredient && lab1Ingredient !== order?.ingredient1 && creep.store.getFreeCapacity() > 0) {
        if (moveTo(creep, { pos: lab1.pos, range: 1 }) === BehaviorResult.SUCCESS) {
          creep.withdraw(lab1, lab1Ingredient)
        }
        return; // Getting available product
      } else if (lab2 && lab2Ingredient && lab2Ingredient !== order?.ingredient2 && creep.store.getFreeCapacity() > 0) {
        if (moveTo(creep, { pos: lab2.pos, range: 1 }) === BehaviorResult.SUCCESS) {
          creep.withdraw(lab2, lab2Ingredient)
        }
        return; // Getting available product
      } else {
        // No further ingredients or product to transfer, return to Storage
        setState(States.DEPOSIT)(creep)
      }
    }
  }
}
