import { BehaviorResult } from "Behaviors/Behavior";
import { moveTo } from "Behaviors/moveTo";
import { renewAtSpawn } from "Behaviors/renewAtSpawn";
import { setState, States } from "Behaviors/states";
import { MinionBuilders, MinionTypes } from "Minions/minionTypes";
import { spawnMinion } from "Minions/spawnMinion";
import { byId } from "Selectors/byId";
import { getLabs } from "Selectors/getLabs";
import { ingredientsNeededForLabOrder } from "Selectors/ingredientsNeededForLabOrder";
import { labsShouldBeEmptied } from "Selectors/labsShouldBeEmptied";
import { minionCostPerTick } from "Selectors/minionCostPerTick";
import { rcl } from "Selectors/rcl";
import { roomPlans } from "Selectors/roomPlans";
import { spawnEnergyAvailable } from "Selectors/spawnEnergyAvailable";
import { getAvailableResourcesFromTerminal, getLabOrderDependencies } from "Structures/Labs/getLabOrderDependencies";
import { LabOrder } from "Structures/Labs/LabOrder";
import profiler from "utils/profiler";
import { Objective } from "./Objective";


declare global {
    interface CreepMemory {
        scienceIngredients?: ResourceConstant[]
        scienceProduct?: ResourceConstant
    }
}

/**
 * Transfers resources between Terminal and Labs
 */
export class ScienceObjective extends Objective {
    energyValue(office: string) {
        return -(minionCostPerTick(MinionBuilders[MinionTypes.ACCOUNTANT](spawnEnergyAvailable(office))))
    }
    spawn() {
        for (let office in Memory.offices) {
            if (rcl(office) < 6 || roomPlans(office)?.labs?.labs.every(e => !e.structure)) continue; // No labs
            const scientists = this.assigned.map(byId).filter(c =>
                c?.memory.office === office &&
                (!c.ticksToLive || c.ticksToLive > 100)
            ).length

            if (scientists < 1) {
                spawnMinion(
                    office,
                    this.id,
                    MinionTypes.ACCOUNTANT,
                    MinionBuilders[MinionTypes.ACCOUNTANT](spawnEnergyAvailable(office))
                )({ preferredSpawn: roomPlans(office)?.headquarters?.spawn.structure as StructureSpawn })
            }
        }
    }

    action(creep: Creep) {
        const order = Memory.offices[creep.memory.office].labOrders?.find(o => o.amount > 0) as LabOrder|undefined;

        if ((creep.ticksToLive ?? 1500) < 200) {
            setState(States.RENEW)(creep)
        } else if (labsShouldBeEmptied(creep.memory.office) && creep.memory.state !== States.DEPOSIT) {
            setState(States.EMPTY_LABS)(creep)
        } else if (!creep.memory.state) {
            setState(States.DEPOSIT)(creep)
        }

        if (creep.memory.state === States.RENEW) {
            if (renewAtSpawn(creep) === BehaviorResult.SUCCESS) {
                setState(States.DEPOSIT)(creep);
            }
            return;
        }
        if (creep.memory.state === States.DEPOSIT) {
            const terminal = roomPlans(creep.memory.office)?.headquarters?.terminal.structure
            if (!terminal) return;
            if (moveTo(terminal.pos)(creep) === BehaviorResult.SUCCESS) {
                const toDeposit = Object.keys(creep.store)[0] as ResourceConstant|undefined;
                if (toDeposit && creep.transfer(terminal, toDeposit) === OK) {
                    if (order && toDeposit === order.output) {
                        // Decrement output from the lab order
                        order.amount -= creep.store.getUsedCapacity(toDeposit);
                    }
                    return; // Other resources deposited
                } else if (labsShouldBeEmptied(creep.memory.office)) {
                    setState(States.EMPTY_LABS)(creep)
                } else {
                    // Nothing further to deposit
                    setState(States.WITHDRAW)(creep)
                }
            }
        }
        if (order && creep.memory.state === States.WITHDRAW) {
            const terminal = roomPlans(creep.memory.office)?.headquarters?.terminal.structure as StructureTerminal|undefined
            if (!terminal) return;
            const {ingredient1, ingredient2} = ingredientsNeededForLabOrder(creep.memory.office, order);

            const ingredientQuantity = (i: number) => Math.min(Math.floor(creep.store.getCapacity() / 2), i)
            const target1 = Math.max(0, ingredientQuantity(ingredient1) - creep.store.getUsedCapacity(order.ingredient1));
            const target2 = Math.max(0, ingredientQuantity(ingredient2) - creep.store.getUsedCapacity(order.ingredient2));

            // if (creep.memory.office === 'W8N3') console.log(creep.memory.office, 'withdraw', order.ingredient1, target1, ingredient1, order.ingredient2, ingredient2, target2)

            if (
                ingredient1 + ingredient2 === 0 &&
                creep.store.getUsedCapacity(order.ingredient1) + creep.store.getUsedCapacity(order.ingredient2) === 0
            ) {
                // No more ingredients needed; just empty labs of product
                setState(States.EMPTY_LABS)(creep)
            } else if (creep.store.getUsedCapacity(order.ingredient1) >= target1 && creep.store.getUsedCapacity(order.ingredient2) >= target2) {
                // Creep is already full of ingredients
                setState(States.FILL_LABS)(creep)
            } else if (moveTo(terminal.pos)(creep) === BehaviorResult.SUCCESS) {
                if (target1 > 0 && creep.withdraw(terminal, order.ingredient1, target1) === OK) {
                    return; // Ingredients withdrawn
                } else if (target2 > 0 && creep.withdraw(terminal, order.ingredient2, target2) === OK) {
                    return; // Ingredients withdrawn
                } else if (target1 > 0 || target2 > 0) {
                    // No ingredients available, recalculate lab orders
                    const orders = Memory.offices[creep.memory.office].labOrders;
                    const targetOrder = orders[orders.length - 1]
                    Memory.offices[creep.memory.office].labOrders = getLabOrderDependencies(
                        targetOrder,
                        getAvailableResourcesFromTerminal(terminal)
                    ).concat(targetOrder);
                    return;
                } else {
                    // No ingredients needed, or no more available
                    setState(States.FILL_LABS)(creep)
                }
            }
        }
        if (order && creep.memory.state === States.FILL_LABS) {
            const { inputs, outputs } = getLabs(creep.memory.office);
            const [lab1, lab2] = inputs.map(s => s.structure) as (StructureLab|undefined)[];
            const nextOutputLab = outputs.map(s => s.structure).find(s => ((s as StructureLab)?.store.getUsedCapacity(order.output) ?? 0) > 100) as StructureLab|undefined;

            // if (creep.memory.office === 'W8N2') console.log(creep.memory.office, 'fill_labs', order.ingredient1, creep.store.getUsedCapacity(order.ingredient1), order.ingredient2, creep.store.getUsedCapacity(order.ingredient2))
            // if (creep.memory.office === 'W8N2') console.log(creep.memory.office, 'fill_labs', lab1?.store.getFreeCapacity(order.ingredient1), lab2?.store.getFreeCapacity(order.ingredient2))

            if (lab1 && (lab1?.store.getFreeCapacity(order.ingredient1) ?? 0) > 0 && creep.store.getUsedCapacity(order.ingredient1) > 0) {
                if (moveTo(lab1.pos, 1)(creep) === BehaviorResult.SUCCESS) {
                    creep.transfer(lab1, order.ingredient1)
                }
                return; // Ingredients deposited
            } else if (lab2 && (lab2?.store.getFreeCapacity(order.ingredient2) ?? 0) > 0 && creep.store.getUsedCapacity(order.ingredient2) > 0) {
                if (moveTo(lab2.pos, 1)(creep) === BehaviorResult.SUCCESS) {
                    creep.transfer(lab2, order.ingredient2)
                }
                return; // Ingredients deposited
            } else if (nextOutputLab && creep.store.getFreeCapacity() > 0) {
                if (moveTo(nextOutputLab.pos, 1)(creep) === BehaviorResult.SUCCESS) {
                    creep.withdraw(nextOutputLab, order.output)
                }
                return; // Getting available product
            } else {
                // No further ingredients or product to transfer, return to Storage
                setState(States.DEPOSIT)(creep)
            }
        }
        if (creep.memory.state === States.EMPTY_LABS) {
            const { inputs, outputs } = getLabs(creep.memory.office);
            const nextOutputLab = outputs.map(s => s.structure).find(s => Object.keys((s as StructureLab)?.store ?? {}).length > 0) as StructureLab|undefined;
            const outputLabIngredient = Object.keys(nextOutputLab?.store ?? {})[0] as ResourceConstant | undefined;
            const [lab1, lab2] = inputs.map(s => s.structure) as (StructureLab|undefined)[];
            const lab1Ingredient = Object.keys(lab1?.store ?? {}).find(k => !order || k !== order.ingredient1) as ResourceConstant | undefined;
            const lab2Ingredient = Object.keys(lab2?.store ?? {}).find(k => !order || k !== order.ingredient2) as ResourceConstant | undefined;

            // if (creep.memory.office === 'W8N3') console.log(creep.memory.office, 'EMPTY_LABS', outputLabIngredient, lab1Ingredient, lab2Ingredient)

            if (nextOutputLab && outputLabIngredient && creep.store.getFreeCapacity() > 0) {
                if (moveTo(nextOutputLab.pos, 1)(creep) === BehaviorResult.SUCCESS) {
                    creep.withdraw(nextOutputLab, outputLabIngredient)
                }
                return; // Getting available product
            } else if (lab1 && lab1Ingredient && creep.store.getFreeCapacity() > 0) {
                if (moveTo(lab1.pos, 1)(creep) === BehaviorResult.SUCCESS) {
                    creep.withdraw(lab1, lab1Ingredient)
                }
                return; // Getting available product
            } else if (lab2 && lab2Ingredient && creep.store.getFreeCapacity() > 0) {
                if (moveTo(lab2.pos, 1)(creep) === BehaviorResult.SUCCESS) {
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

profiler.registerClass(ScienceObjective, 'ScienceObjective')
