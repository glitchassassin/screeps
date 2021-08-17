import { getEnergyStructures } from "Selectors/spawnsAndExtensionsDemand";

declare global {
    interface CreepMemory {
        type: MinionTypes,
        office: string,
    }
}

export interface Minion {
    body: BodyPartConstant[],
    name: string,
    memory: CreepMemory
}

export enum MinionTypes {
    ACCOUNTANT = 'ACCOUNTANT',
    ENGINEER = 'ENGINEER',
    FOREMAN = 'FOREMAN',
    GUARD = 'GUARD',
    AUDITOR = 'AUDITOR',
    LAWYER = 'LAWYER',
    PARALEGAL = 'PARALEGAL',
    SALESMAN = 'SALESMAN',
    MARKETER = 'MARKETER',
}

export const spawnMinion = (office: string, objective: string, minionType: MinionTypes, body: BodyPartConstant[]) => (spawn: StructureSpawn) => {
    if (body.length === 0) return ERR_NO_BODYPART;
    const r = spawn.spawnCreep(
        body,
        `${minionType}-${office}-${Game.time % 10000}-${spawn.id.slice(23)}`,
        { memory: {
            type: minionType,
            office,
            objective
        }, energyStructures: getEnergyStructures(office)}
    )
    if (r !== OK && r !== ERR_BUSY && r !== ERR_NOT_ENOUGH_ENERGY) {
        console.log(objective, 'unexpected Spawn error', r)
    }
    return r;
}

export const MinionBuilders = {
    [MinionTypes.ACCOUNTANT]: (energy: number, maxCarryParts = 32) => {
        if (energy < 200 || maxCarryParts === 0) {
            return [];
        }
        // 2/3 CARRY, 1/3 MOVE
        let moveParts = Math.min(16, Math.ceil(Math.max(1, maxCarryParts) / 2), Math.floor(energy/3/50))
        let carryParts = Math.min(32, Math.max(1, maxCarryParts), 2 * moveParts);

        return [...Array(carryParts).fill(CARRY), ...Array(moveParts).fill(MOVE)];
    },
    [MinionTypes.ENGINEER]: (energy: number) => {
        if (energy < 200) {
            return [];
        }
        else {
            // Try to maintain WORK/CARRY/MOVE ratio
            let workParts = Math.min(16, Math.floor(((1/2) * energy) / 100))

            return [
                ...Array(workParts).fill(WORK),
                ...Array(workParts).fill(CARRY),
                ...Array(workParts).fill(MOVE)
            ]
        }
    },
    [MinionTypes.FOREMAN]: (energy: number) => {
        if (energy < 550) {
            return [];
        }
        else {
            // Maintain 5-1 WORK-MOVE ratio
            let workParts = Math.min(40, Math.floor((10/11 * energy) / 100))
            let moveParts = Math.min(8, Math.floor((1/11 * energy) / 50))
            return [...Array(workParts).fill(WORK), ...Array(moveParts).fill(MOVE)]
        }
    },
    [MinionTypes.GUARD]: (energy: number) => {
        if (energy < 200) {
            return [];
        }
        else {
            // Try to maintain ATTACK/MOVE ratio
            let attackParts = Math.min(25, Math.floor(((80/130) * energy) / 80))
            return [
                ...Array(attackParts).fill(ATTACK),
                ...Array(attackParts).fill(MOVE),
            ]
        }
    },
    [MinionTypes.AUDITOR]: (energy: number) => {
        return [TOUGH, TOUGH, MOVE, MOVE, MOVE, MOVE];
    },
    [MinionTypes.LAWYER]:  (energy: number) => {
        if (energy < 850) {
            return [];
        }
        else {
            let claimParts = 1;
            let moveParts = claimParts * 5;
            return [
                ...Array(claimParts).fill(CLAIM),
                ...Array(moveParts).fill(MOVE),
            ]
        }
    },
    [MinionTypes.MARKETER]:  (energy: number) => {
        if (energy < 850) {
            return [];
        }
        else {
            // Equal claim and move parts
            let claimParts = Math.floor(energy / (BODYPART_COST[CLAIM] + BODYPART_COST[MOVE]));
            return [
                ...Array(claimParts).fill(CLAIM),
                ...Array(claimParts).fill(MOVE),
            ]
        }
    },
    [MinionTypes.PARALEGAL]: (energy: number) => {
        if (energy < 250) {
            return [];
        }
        else {
            // Max for an upgrader at RCL8 is 15 energy/tick, so we'll cap these there
            let workParts = Math.min(15, Math.floor(((energy - 50) * 3/4) / 100))
            let moveParts = Math.min(8, Math.floor(((energy - 50) * 1/4) / 50))
            return [...Array(workParts).fill(WORK), CARRY, ...Array(moveParts).fill(MOVE)]
        }
    },
    [MinionTypes.SALESMAN]: (energy: number) => {
        if (energy < 200) {
            return [];
        } else {
            let moveParts = (energy <= 550) ? 1 : 2;
            let carryParts = 1;
            let workParts = Math.min(5, Math.floor((energy - (moveParts + carryParts) * 50) / 100));
            return [
                ...Array(workParts).fill(WORK),
                ...Array(moveParts).fill(MOVE),
                ...Array(carryParts).fill(CARRY),
            ]
        }
    }
}

