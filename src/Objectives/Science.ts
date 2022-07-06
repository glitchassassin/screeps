import { BehaviorResult } from "Behaviors/Behavior";
import { moveTo } from "Behaviors/moveTo";
import { setState, States } from "Behaviors/states";
import { Budgets } from "Budgets";
import { MinionBuilders, MinionTypes } from "Minions/minionTypes";
import { spawnMinion } from "Minions/spawnMinion";
import { byId } from "Selectors/byId";
import { getLabs } from "Selectors/getLabs";
import { getPrimarySpawn } from "Selectors/getPrimarySpawn";
import { ingredientsNeededForLabOrder } from "Selectors/ingredientsNeededForLabOrder";
import { labsShouldBeEmptied } from "Selectors/labsShouldBeEmptied";
import { minionCostPerTick } from "Selectors/minionCostPerTick";
import { rcl } from "Selectors/rcl";
import { roomPlans } from "Selectors/roomPlans";
import { boostLabsToEmpty, boostLabsToFill, boostsNeededForLab, shouldHandleBoosts } from "Selectors/shouldHandleBoosts";
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
    cost(office: string) {
        return minionCostPerTick(MinionBuilders[MinionTypes.ACCOUNTANT](spawnEnergyAvailable(office)));
    }
    budget(office: string, energy: number) {
        if (!roomPlans(office)?.labs?.labs.some(l => l.structure) || !roomPlans(office)?.headquarters?.terminal.structure) {
            return {
                cpu: 0,
                spawn: 0,
                energy: 0
            }
        }
        let body = MinionBuilders[MinionTypes.ACCOUNTANT](spawnEnergyAvailable(office));
        let cost = minionCostPerTick(body);
        return {
            cpu: 0.5,
            spawn: body.length * CREEP_SPAWN_TIME,
            energy: cost,
        }
    }
    public hasFixedBudget(office: string) {
        return true;
    }
    structures() {
    }
    spawn() {
        for (let office in Memory.offices) {
            const budget = Budgets.get(office)?.get(this.id)?.energy ?? 0;
            if (
                rcl(office) < 6 || roomPlans(office)?.labs?.labs.every(e => !e.structure) || // No labs
                budget === 0
            ) {
                this.metrics.set(office, {spawnQuota: 0, energyBudget: budget, minions: this.minions(office).length})
                continue;
            }
            const scientists = this.assigned.map(byId).filter(c =>
                c?.memory.office === office &&
                (!c.ticksToLive || c.ticksToLive > 100)
            ).length

            this.metrics.set(office, {spawnQuota: 1, energyBudget: budget, minions: scientists})

            if (scientists < 1) {
                this.recordEnergyUsed(office, spawnMinion(
                    office,
                    this.id,
                    MinionTypes.ACCOUNTANT,
                    MinionBuilders[MinionTypes.ACCOUNTANT](spawnEnergyAvailable(office))
                )({ preferredSpawn: getPrimarySpawn(office) }))
            }
        }
    }

    action(creep: Creep) {
        if (shouldHandleBoosts(creep.memory.office)) {
            this.handleBoosts(creep);
        } else {
            this.handleLabOrders(creep);
        }
    }

    handleBoosts(creep: Creep) {
        if ((creep.ticksToLive ?? 1500) < 200) {
            setState(States.RECYCLE)(creep)
        } else if (boostLabsToEmpty(creep.memory.office).length > 0 && creep.store.getUsedCapacity() === 0) {
            setState(States.EMPTY_LABS)(creep)
        } else if (!creep.memory.state) {
            setState(States.DEPOSIT)(creep)
        }

        const terminal = roomPlans(creep.memory.office)?.headquarters?.terminal.structure as StructureTerminal|undefined
        if (!terminal) return;

        if (creep.memory.state === States.RECYCLE) {
            if (creep.store.getUsedCapacity() === 0) {
                // Go to spawn and recycle
                const spawn = getPrimarySpawn(creep.memory.office);
                if (spawn && moveTo(spawn.pos)(creep) === BehaviorResult.SUCCESS) {
                    spawn.recycleCreep(creep);
                }
            } else if (moveTo(terminal.pos)(creep) === BehaviorResult.SUCCESS) {
                const toDeposit = Object.keys(creep.store)[0] as ResourceConstant|undefined;
                if (toDeposit && creep.transfer(terminal, toDeposit) === OK) {
                    return; // Other resources deposited
                }
            }
        }

        if (creep.memory.state === States.DEPOSIT) {
            if (creep.store.getUsedCapacity() === 0) {
                setState(States.WITHDRAW)(creep)
            }
            if (moveTo(terminal.pos)(creep) === BehaviorResult.SUCCESS) {
                const toDeposit = Object.keys(creep.store)[0] as ResourceConstant|undefined;
                if (toDeposit && creep.transfer(terminal, toDeposit) === OK) {
                    return; // Other resources deposited
                } else {
                    // Nothing further to deposit
                    setState(States.WITHDRAW)(creep)
                }
            }
        }
        if (creep.memory.state === States.WITHDRAW) {
            if (moveTo(terminal.pos)(creep) === BehaviorResult.SUCCESS) {
                if (creep.store.getFreeCapacity() > 0) {
                    for (const lab of boostLabsToFill(creep.memory.office)) {
                        let [resource, needed] = boostsNeededForLab(creep.memory.office, lab.structureId as Id<StructureLab>|undefined);
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
            const target = boostLabsToEmpty(creep.memory.office)[0];
            const resource = (target?.structure as StructureLab|undefined)?.mineralType
            if (!target?.structure || !resource || creep.store.getFreeCapacity() === 0) {
                setState(States.DEPOSIT)(creep);
                return;
            }
            if (moveTo(target.pos)(creep) === BehaviorResult.SUCCESS) {
                creep.withdraw(target.structure, resource);
            }
        }
        if (creep.memory.state === States.FILL_LABS) {
            const target = boostLabsToFill(creep.memory.office).find(lab => {
                const [resource] = boostsNeededForLab(creep.memory.office, lab.structureId as Id<StructureLab>|undefined);
                    return creep.store.getUsedCapacity(resource) > 0;
                })

            if (!target?.structure) {
                setState(States.DEPOSIT)(creep);
                return;
            }
            const [resource, amount] = boostsNeededForLab(creep.memory.office, target.structureId as Id<StructureLab>|undefined);
            if (!resource || !amount) {
                setState(States.DEPOSIT)(creep);
                return;
            }
            if (moveTo(target.pos)(creep) === BehaviorResult.SUCCESS) {
                creep.transfer(target.structure, resource, Math.min(amount, creep.store.getUsedCapacity(resource)));
            }
        }
    }

    handleLabOrders(creep: Creep) {
        const order = Memory.offices[creep.memory.office].lab.orders.find(o => o.amount > 0) as LabOrder|undefined;

        if ((creep.ticksToLive ?? 1500) < 200) {
            setState(States.RECYCLE)(creep)
        } else if (labsShouldBeEmptied(creep.memory.office) && creep.store.getFreeCapacity() > 0) {
            setState(States.EMPTY_LABS)(creep)
        } else if (!creep.memory.state) {
            setState(States.DEPOSIT)(creep)
        }
        const terminal = roomPlans(creep.memory.office)?.headquarters?.terminal.structure

        if (creep.memory.state === States.RECYCLE) {
            if (creep.store.getUsedCapacity() === 0) {
                // Go to spawn and recycle
                const spawn = getPrimarySpawn(creep.memory.office);
                if (spawn && moveTo(spawn.pos)(creep) === BehaviorResult.SUCCESS) {
                    spawn.recycleCreep(creep);
                }
            } else if (terminal && moveTo(terminal.pos)(creep) === BehaviorResult.SUCCESS) {
                const toDeposit = Object.keys(creep.store)[0] as ResourceConstant|undefined;
                if (toDeposit && creep.transfer(terminal, toDeposit) === OK) {
                    return; // Other resources deposited
                }
            }
        }
        if (creep.memory.state === States.DEPOSIT) {
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
            const target1 = Math.min(
                Math.max(0, ingredientQuantity(ingredient1) - creep.store.getUsedCapacity(order.ingredient1)),
                creep.store.getFreeCapacity(),
                terminal.store.getUsedCapacity(order.ingredient1)
            );
            const target2 = Math.min(
                Math.max(0, ingredientQuantity(ingredient2) - creep.store.getUsedCapacity(order.ingredient2)),
                creep.store.getFreeCapacity(),
                terminal.store.getUsedCapacity(order.ingredient2)
            );

            // if (creep.memory.office === 'E15N12') console.log(creep.memory.office, 'withdraw', order.ingredient1, target1, ingredient1, order.ingredient2, ingredient2, target2)

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
                    const orders = Memory.offices[creep.memory.office].lab.orders;
                    const targetOrder = orders[orders.length - 1]
                    Memory.offices[creep.memory.office].lab.orders = getLabOrderDependencies(
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
            const nextOutputLab = outputs.map(s => s.structure).find(s => !!(s as StructureLab)?.mineralType) as StructureLab|undefined;
            const outputLabIngredient = nextOutputLab?.mineralType;
            const [lab1, lab2] = inputs.map(s => s.structure) as (StructureLab|undefined)[];
            const lab1Ingredient = lab1?.mineralType;
            const lab2Ingredient = lab2?.mineralType;

            // if (creep.memory.office === 'W6N8') console.log(creep.memory.office, 'EMPTY_LABS', outputLabIngredient, lab1Ingredient, lab2Ingredient)

            if (nextOutputLab && outputLabIngredient && creep.store.getFreeCapacity() > 0) {
                if (moveTo(nextOutputLab.pos, 1)(creep) === BehaviorResult.SUCCESS) {
                    creep.withdraw(nextOutputLab, outputLabIngredient)
                }
                return; // Getting available product
            } else if (lab1 && lab1Ingredient && lab1Ingredient !== order?.ingredient1 && creep.store.getFreeCapacity() > 0) {
                if (moveTo(lab1.pos, 1)(creep) === BehaviorResult.SUCCESS) {
                    creep.withdraw(lab1, lab1Ingredient)
                }
                return; // Getting available product
            } else if (lab2 && lab2Ingredient && lab2Ingredient !== order?.ingredient2 && creep.store.getFreeCapacity() > 0) {
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
