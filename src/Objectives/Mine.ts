import { MinionBuilders, MinionTypes } from "Minions/minionTypes";
import { States, setState } from "Behaviors/states";

import { BehaviorResult } from "Behaviors/Behavior";
import { Objective } from "./Objective";
import { byId } from "Selectors/byId";
import { getResourcesFromMineContainer } from "Behaviors/getResourcesFromMineContainer";
import { isPositionWalkable } from "Selectors/MapCoordinates";
import { minionCostPerTick } from "Selectors/minionCostPerTick";
import { moveTo } from "Behaviors/moveTo";
import { roomPlans } from "Selectors/roomPlans";
import { spawnEnergyAvailable } from "Selectors/spawnEnergyAvailable";

export class MineObjective extends Objective {
    energyValue(office: string) {
        return -(
            this.targetAccountants(office) * minionCostPerTick(MinionBuilders[MinionTypes.ACCOUNTANT](spawnEnergyAvailable(office))) +
            this.targetForemen(office) * minionCostPerTick(MinionBuilders[MinionTypes.FOREMAN](spawnEnergyAvailable(office)))
        )
    }
    targetForemen(office: string) {
        const mine = roomPlans(office)?.office?.mine;
        // Only spawn Foreman/Accountant if mine structures are built
        if (!mine?.extractor.structure || !mine?.container.structure) return 0;
        const mineral = byId(Memory.rooms[office].mineralId)
        return mineral?.mineralAmount ? 1 : 0;
    }
    targetAccountants(office: string) {
        const mine = roomPlans(office)?.office?.mine;
        // Only spawn Foreman/Accountant if mine structures are built
        if (!mine?.extractor.structure || !mine?.container.structure) return 0;
        return (mine.container.structure as StructureContainer).store.getUsedCapacity() ? 1 : 0; // One Foreman/Accountant (if there is anything to mine)
    }
    spawn(office: string, spawns: StructureSpawn[]) {
        const targetForemen = this.targetForemen(office);
        const targetAccountants = this.targetAccountants(office);
        const foremen = this.assigned.map(byId).filter(c => c?.memory.office === office && c.memory.type === MinionTypes.FOREMAN).length
        const accountants = this.assigned.map(byId).filter(c => c?.memory.office === office && c.memory.type === MinionTypes.ACCOUNTANT).length

        let spawnQueue = [];

        if (targetForemen > foremen) {
            spawnQueue.push((spawn: StructureSpawn) => spawn.spawnCreep(
                MinionBuilders[MinionTypes.FOREMAN](spawnEnergyAvailable(office)),
                `${MinionTypes.FOREMAN}${Game.time % 10000}`,
                { memory: {
                    type: MinionTypes.FOREMAN,
                    office,
                    objective: this.id,
                }}
            ))
        }

        if (targetAccountants > accountants) {
            spawnQueue.push((spawn: StructureSpawn) => spawn.spawnCreep(
                MinionBuilders[MinionTypes.ACCOUNTANT](spawnEnergyAvailable(office)),
                `${MinionTypes.ACCOUNTANT}${Game.time % 10000}`,
                { memory: {
                    type: MinionTypes.ACCOUNTANT,
                    office,
                    objective: this.id,
                }}
            ))
        }

        // Truncate spawn queue to length of available spawns
        spawnQueue = spawnQueue.slice(0, spawns.length);

        // For each available spawn, up to the target number of minions,
        // try to spawn a new minion
        spawnQueue.forEach((spawner, i) => spawner(spawns[i]));

        return spawnQueue.length;
    }

    action = (creep: Creep) => {
        if (creep.memory.type === MinionTypes.FOREMAN || creep.memory.type === MinionTypes.ACCOUNTANT) {
            this.actions[creep.memory.type](creep);
        }
    }

    actions = {
        [MinionTypes.FOREMAN]: (creep: Creep) => {
            const mine = byId(Memory.rooms[creep.memory.office].mineralId);
            if (!mine) return;
            const plan = roomPlans(creep.memory.office)?.office?.mine;
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
            const plan = roomPlans(creep.memory.office)?.office?.mine;
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
                const storage = roomPlans(creep.memory.office)?.office?.headquarters.storage;
                const terminal = roomPlans(creep.memory.office)?.office?.headquarters.terminal;
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

