import { MinionBuilders, MinionTypes } from "Minions/minionTypes";
import { spawnMinion } from "Minions/spawnMinion";
import { facilitiesWorkToDo } from "Selectors/facilitiesWorkToDo";
import { minionCostPerTick } from "Selectors/minionCostPerTick";
import { posById } from "Selectors/posById";
import { rcl } from "Selectors/rcl";
import { getFranchisePlanBySourceId } from "Selectors/roomPlans";
import { spawnEnergyAvailable } from "Selectors/spawnEnergyAvailable";
import profiler from "utils/profiler";
import { FranchiseObjectives } from "./Franchise";
import { LogisticsObjective } from "./Logistics";
import { Objective, Objectives } from "./Objective";

export class PriorityLogisticsObjective extends Objective {
    budget(office: string, energy: number) {
        let body = MinionBuilders[MinionTypes.ACCOUNTANT](spawnEnergyAvailable(office));
        let cost = minionCostPerTick(body);
        let targetCarry = this.targetCarry(office);
        let count = Math.min(Math.floor(energy / cost), Math.floor(targetCarry / body.filter(p => p === CARRY).length))
        return {
            cpu: 0.5 * count,
            spawn: body.length * CREEP_SPAWN_TIME * count,
            energy: cost * count,
        }
    }

    targetCarry(office: string) {
        // For each office/franchise, calculate distance and cache
        let energyCapacity = 0;
        for (let id in FranchiseObjectives) {
            const franchise = FranchiseObjectives[id];
            if (franchise.office !== office || franchise.assigned.length === 0) continue;

            const pos = posById(franchise.sourceId);
            if (!pos) continue;

            const plan = getFranchisePlanBySourceId(franchise.sourceId);
            let salesmanCostPerTick = 650 / 1500;

            energyCapacity += salesmanCostPerTick * franchise.distance * 2;
        }

        return Math.ceil(energyCapacity / CARRY_CAPACITY)
    }

    spawn() {
        for (let office in Memory.offices) {
            let actualCarry = (Objectives['LogisticsObjective'] as LogisticsObjective).actualCarry(office);
            let accountants = 0;

            const targetCarry = this.targetCarry(office)
            // console.log(actualCarry, targetCarry);
            const cpuLimit = (0.8 * Game.cpu.limit) / 0.5
            // If RCL > 3, and we have fewer than ten roads to construct, use beefier Accountants
            const roads = rcl(office) > 3 && facilitiesWorkToDo(office)
                .filter(s => !s.structure && s.structureType === STRUCTURE_ROAD).length < 10
            // console.log('actual', actualCarry, 'target', targetCarry, 'cpuLimit', cpuLimit)
            // Pre-spawn accountants

            const targetMinions = Math.ceil(targetCarry / MinionBuilders[MinionTypes.ACCOUNTANT](spawnEnergyAvailable(office), 25, roads).filter(p => p === CARRY).length)

            this.metrics.set(office, {spawnQuota: targetMinions, minions: this.minions(office).length})

            let result: ScreepsReturnCode = OK;
            if (actualCarry < targetCarry && accountants < cpuLimit) {
                spawnMinion(
                    office,
                    this.id,
                    MinionTypes.ACCOUNTANT,
                    MinionBuilders[MinionTypes.ACCOUNTANT](spawnEnergyAvailable(office), 25, roads)
                )()
            }
        }
    }

    action(creep: Creep) {
        // Reassign minions
        creep.memory.objective = 'LogisticsObjective'
    }
}

profiler.registerClass(PriorityLogisticsObjective, 'PriorityLogisticsObjective')
