import { BehaviorResult } from "Behaviors/Behavior";
import { getResourcesFromMineContainer } from "Behaviors/getResourcesFromMineContainer";
import { moveTo } from "Behaviors/moveTo";
import { setState, States } from "Behaviors/states";
import { MinionBuilders, MinionTypes } from "Minions/minionTypes";
import { spawnMinion } from "Minions/spawnMinion";
import { byId } from "Selectors/byId";
import { isPositionWalkable } from "Selectors/MapCoordinates";
import { minionCostPerTick } from "Selectors/minionCostPerTick";
import { roomPlans } from "Selectors/roomPlans";
import { spawnEnergyAvailable } from "Selectors/spawnEnergyAvailable";
import profiler from "utils/profiler";
import { Objective } from "./Objective";


export class MineObjective extends Objective {
    energyValue(office: string) {
        const carry = this.targetCarry(office);
        return -(
            (carry ? minionCostPerTick(MinionBuilders[MinionTypes.ACCOUNTANT](spawnEnergyAvailable(office), carry)) : 0) +
            this.targetForemen(office) * minionCostPerTick(MinionBuilders[MinionTypes.FOREMAN](spawnEnergyAvailable(office)))
        )
    }
    targetForemen(office: string) {
        const mine = roomPlans(office)?.mine;
        // Only spawn Foreman/Accountant if mine structures are built
        if (!mine?.extractor.structure || !mine?.container.structure) return 0;
        const mineral = byId(Memory.rooms[office].mineralId)
        return mineral?.mineralAmount ? 1 : 0;
    }
    targetCarry(office: string) {
        const mine = roomPlans(office)?.mine;
        const workParts = MinionBuilders[MinionTypes.FOREMAN](spawnEnergyAvailable(office)).filter(p => p === WORK).length;
        const minedPerTick = (HARVEST_MINERAL_POWER * workParts) / EXTRACTOR_COOLDOWN;
        const estimatedPerTrip = 50 * minedPerTick
        const estimatedCarry = Math.ceil(estimatedPerTrip / CARRY_CAPACITY)
        // Only spawn Foreman/Accountant if mine structures are built
        if (!mine?.extractor.structure || !mine?.container.structure) return 0;
        return (mine.container.structure as StructureContainer).store.getUsedCapacity() ? estimatedCarry : 0; // One Foreman/Accountant (if there is anything to mine)
    }
    spawn() {
        for (let office in Memory.offices) {
            const targetForemen = this.targetForemen(office);
            const targetCarry = this.targetCarry(office);
            const foremen = this.assigned.map(byId).filter(c => c?.memory.office === office && c.memory.type === MinionTypes.FOREMAN).length
            const accountants = this.assigned.map(byId).filter(c => c?.memory.office === office && c.memory.type === MinionTypes.ACCOUNTANT).length

            let spawnQueue = [];

            if (targetForemen > foremen) {
                spawnQueue.push(spawnMinion(
                    office,
                    this.id,
                    MinionTypes.FOREMAN,
                    MinionBuilders[MinionTypes.FOREMAN](spawnEnergyAvailable(office))
                ))
            }

            if (targetCarry && 1 > accountants) {
                spawnQueue.push(spawnMinion(
                    office,
                    this.id,
                    MinionTypes.ACCOUNTANT,
                    MinionBuilders[MinionTypes.ACCOUNTANT](spawnEnergyAvailable(office), targetCarry)
                ))
            }

            // For each available spawn, up to the target number of minions,
            // try to spawn a new minion
            spawnQueue.forEach((spawner, i) => spawner());
        }
    }

    action(creep: Creep) {
        if (creep.memory.type === MinionTypes.FOREMAN || creep.memory.type === MinionTypes.ACCOUNTANT) {
            this.actions[creep.memory.type](creep);
        }
    }

    actions = {
        [MinionTypes.FOREMAN]: (creep: Creep) => {
            const mine = byId(Memory.rooms[creep.memory.office].mineralId);
            if (!mine) return;
            const plan = roomPlans(creep.memory.office)?.mine;
            if (!plan?.extractor.structure) return;

            // Prefer to work from container position, fall back to adjacent position
            if (
                !creep.pos.isEqualTo(plan.container.pos) &&
                plan.container.pos.lookFor(LOOK_CREEPS).length === 0
            ) {
                moveTo(plan.container.pos, 0)(creep);
            } else if (!creep.pos.isNearTo(mine.pos!)) {
                moveTo(mine.pos, 1)(creep);
            }

            creep.harvest(mine);
        },
        [MinionTypes.ACCOUNTANT]: (creep: Creep) => {
            const plan = roomPlans(creep.memory.office)?.mine;
            if (!plan?.container.structure) return;

            if (!creep.memory.state || creep.store.getUsedCapacity() === 0) {
                setState(States.WITHDRAW)(creep);
            }

            if (creep.memory.state === States.WITHDRAW) {
                if (getResourcesFromMineContainer(creep) === BehaviorResult.SUCCESS) {
                    setState(States.DEPOSIT)(creep);
                }
            }
            if (creep.memory.state === States.DEPOSIT) {
                // Try to deposit to Terminal, or else Storage
                const storage = roomPlans(creep.memory.office)?.headquarters?.storage;
                const terminal = roomPlans(creep.memory.office)?.headquarters?.terminal;
                const res = Object.keys(creep.store)[0] as ResourceConstant|undefined;
                if (!res) {
                    setState(States.WITHDRAW)(creep);
                    return;
                }
                if (!storage || !terminal) return;

                if (terminal.structure && (terminal.structure as StructureTerminal).store.getFreeCapacity()) {
                    if (moveTo(terminal.pos, 1)(creep) === BehaviorResult.SUCCESS) {
                        creep.transfer(terminal.structure, res);
                    }
                } else if (storage.structure) {
                    if (moveTo(storage.pos, 1)(creep) === BehaviorResult.SUCCESS) {
                        creep.transfer(storage.structure, res);
                    }
                } else if (isPositionWalkable(storage.pos)) {
                    // Drop at storage position
                    if (moveTo(storage.pos, 0)(creep) === BehaviorResult.SUCCESS) {
                        creep.drop(res);
                    }
                } else {
                    // Drop next to storage under construction
                    if (moveTo(storage.pos, 1)(creep) === BehaviorResult.SUCCESS) {
                        creep.drop(res);
                    }
                }
            }
        }
    }
}

profiler.registerClass(MineObjective, 'MineObjective')
