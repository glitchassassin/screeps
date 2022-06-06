import { BehaviorResult } from "Behaviors/Behavior";
import { getBoosted } from "Behaviors/getBoosted";
import { getResourcesFromMineContainer } from "Behaviors/getResourcesFromMineContainer";
import { moveTo } from "Behaviors/moveTo";
import { setState, States } from "Behaviors/states";
import { Budgets } from "Budgets";
import { MinionBuilders, MinionTypes } from "Minions/minionTypes";
import { spawnMinion } from "Minions/spawnMinion";
import { byId } from "Selectors/byId";
import { costToBoostMinion } from "Selectors/costToBoostMinion";
import { minionCostPerTick } from "Selectors/minionCostPerTick";
import { officeShouldMine } from "Selectors/officeShouldMine";
import { rcl } from "Selectors/rcl";
import { roomPlans } from "Selectors/roomPlans";
import { spawnEnergyAvailable } from "Selectors/spawnEnergyAvailable";
import { terminalBalance } from "Selectors/terminalBalance";
import profiler from "utils/profiler";
import { Objective } from "./Objective";


export class MineObjective extends Objective {
    public boostQuotas(office: string): { boost: MineralBoostConstant; amount: number; }[] {
        if (rcl(office) < 6) return [];
        return [{ // Store at least enough to boost one creep
            boost: RESOURCE_UTRIUM_ALKALIDE,
            amount: 30 * 50
        }]
    }
    cost(office: string) {
        let foremanBody = this.targetForemen(office) ? MinionBuilders[MinionTypes.FOREMAN](spawnEnergyAvailable(office)) : [];
        let accountantBody = this.targetAccountants(office) ? MinionBuilders[MinionTypes.ACCOUNTANT](spawnEnergyAvailable(office), this.targetCarry(office)) : [];
        let body = foremanBody.concat(accountantBody);
        const boostCost = costToBoostMinion(office, foremanBody.filter(p => p === WORK).length, RESOURCE_UTRIUM_ALKALIDE);
        return minionCostPerTick(body) + boostCost;
    }
    budget(office: string, energy: number) {
        if (!this.targetForemen(office) && !this.targetAccountants(office)) {
            return {
                cpu: 0,
                spawn: 0,
                energy: 0,
            }
        }
        let foremanBody = this.targetForemen(office) ? MinionBuilders[MinionTypes.FOREMAN](spawnEnergyAvailable(office)) : [];
        let accountantBody =  this.targetAccountants(office) ? MinionBuilders[MinionTypes.ACCOUNTANT](spawnEnergyAvailable(office), this.targetCarry(office)) : [];
        return {
            cpu: 0.5 * 2,
            spawn: foremanBody.concat(accountantBody).length * CREEP_SPAWN_TIME,
            energy: this.cost(office),
        }
    }
    public hasFixedBudget(office: string) {
        return true;
    }
    targetForemen(office: string) {
        const mine = roomPlans(office)?.mine;
        // Only spawn Foreman/Accountant if mine structures are built
        if (!mine?.extractor.structure || !mine?.container.structure) return 0;
        const mineral = byId(Memory.rooms[office].mineralId)
        return mineral?.mineralAmount ? 1 : 0;
    }
    targetAccountants(office: string) {
        return (
            this.targetForemen(office) ||
            (roomPlans(office)?.mine?.container.structure as StructureContainer)?.store.getUsedCapacity()
        ) ? 1 : 0;
    }
    targetCarry(office: string) {
        const mine = roomPlans(office)?.mine;
        const workParts = MinionBuilders[MinionTypes.FOREMAN](spawnEnergyAvailable(office)).filter(p => p === WORK).length;
        const boosted = terminalBalance(office, RESOURCE_UTRIUM_ALKALIDE) ? BOOSTS[WORK][RESOURCE_UTRIUM_ALKALIDE].harvest : 1
        const minedPerTick = (HARVEST_MINERAL_POWER * workParts * boosted) / EXTRACTOR_COOLDOWN;
        const estimatedPerTrip = 50 * minedPerTick
        const estimatedCarry = Math.ceil(estimatedPerTrip / CARRY_CAPACITY)
        // Only spawn Foreman/Accountant if mine structures are built
        if (!mine?.extractor.structure || !mine?.container.structure) return 0;
        return (mine.container.structure as StructureContainer).store.getUsedCapacity() ? estimatedCarry : 0; // One Foreman/Accountant (if there is anything to mine)
    }
    spawn() {
        for (let office in Memory.offices) {
            const budget = Budgets.get(office)?.get(this.id)?.energy ?? 0;

            // Check local reserves
            if (!officeShouldMine(office) || budget === 0) continue;
            const targetForemen = this.targetForemen(office);
            const targetCarry = this.targetCarry(office);
            const foremen = this.assigned.map(byId).filter(c => c?.memory.office === office && c.memory.type === MinionTypes.FOREMAN).length
            const accountants = this.assigned.map(byId).filter(c => c?.memory.office === office && c.memory.type === MinionTypes.ACCOUNTANT).length

            this.metrics.set(office, {spawnQuota: targetForemen + 1, energyBudget: budget, minions: this.minions(office).length})

            let spawnQueue = [];

            if (targetForemen > foremen) {
                spawnQueue.push(spawnMinion(
                    office,
                    this.id,
                    MinionTypes.FOREMAN,
                    MinionBuilders[MinionTypes.FOREMAN](spawnEnergyAvailable(office)),
                    [RESOURCE_UTRIUM_ALKALIDE]
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
            spawnQueue.forEach((spawner, i) => this.recordEnergyUsed(office, spawner()));
        }
    }

    action(creep: Creep) {
        if (creep.memory.type === MinionTypes.FOREMAN || creep.memory.type === MinionTypes.ACCOUNTANT) {
            this.actions[creep.memory.type](creep);
        }
    }

    actions = {
        [MinionTypes.FOREMAN]: (creep: Creep) => {
            if (
                creep.memory.state === States.GET_BOOSTED
            ) {
                if (getBoosted(creep) === BehaviorResult.INPROGRESS) {
                    return;
                }
                creep.memory.state = undefined;
            }
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
                // const storage = roomPlans(creep.memory.office)?.headquarters?.storage;
                const terminal = roomPlans(creep.memory.office)?.headquarters?.terminal;
                const res = Object.keys(creep.store)[0] as ResourceConstant|undefined;
                if (!res) {
                    setState(States.WITHDRAW)(creep);
                    return;
                }
                if (!terminal) return;

                if (terminal.structure && (terminal.structure as StructureTerminal).store.getFreeCapacity()) {
                    if (moveTo(terminal.pos, 1)(creep) === BehaviorResult.SUCCESS) {
                        creep.transfer(terminal.structure, res);
                    }
                } else {
                    creep.drop(res)
                } //else if (storage.structure) {
                //     if (moveTo(storage.pos, 1)(creep) === BehaviorResult.SUCCESS) {
                //         creep.transfer(storage.structure, res);
                //     }
                // } else if (isPositionWalkable(storage.pos)) {
                //     // Drop at storage position
                //     if (moveTo(storage.pos, 0)(creep) === BehaviorResult.SUCCESS) {
                //         creep.drop(res);
                //     }
                // } else {
                //     // Drop next to storage under construction
                //     if (moveTo(storage.pos, 1)(creep) === BehaviorResult.SUCCESS) {
                //         creep.drop(res);
                //     }
                // }
            }
        }
    }
}

profiler.registerClass(MineObjective, 'MineObjective')
