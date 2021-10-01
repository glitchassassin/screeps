import { memoize } from "utils/memoizeFunction";

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

export const MinionBuilders = {
    [MinionTypes.ACCOUNTANT]: memoize( // Memoizes at 50-energy increments
        (energy: number, maxSegments = 25, roads = false) => `${Math.round(energy * 2 / 100)} ${maxSegments} ${roads}`,
        (energy: number, maxSegments = 25, roads = false) => {
        if (energy < 200 || maxSegments === 0) {
            return [];
        } else if (energy <= 300) {
            return [CARRY, MOVE]
        } else if (!roads) {
            const segments = Math.min(25, maxSegments, Math.floor((energy / 2) / 100))
            return Array(segments).fill([CARRY, MOVE]).flat();
        } else {
            const segments = Math.min(16, maxSegments, Math.floor((energy / 2) / 150))
            return Array(segments).fill([CARRY, CARRY, MOVE]).flat();
        }
    }),
    [MinionTypes.ENGINEER]: (energy: number) => {
        if (energy < 200) {
            return [];
        }
        else {
            // Try to maintain WORK/CARRY/MOVE ratio
            const segment = [WORK, MOVE, CARRY]
            const segmentCost = segment.reduce((sum, p) => sum + BODYPART_COST[p], 0)
            const segments = Math.min(Math.floor(50 / segment.length), Math.floor(energy / segmentCost))

            return Array(segments).fill(segment).flat()
        }
    },
    [MinionTypes.FOREMAN]: (energy: number) => {
        if (energy < 550) {
            return [];
        }
        else {
            // Maintain 4-1 WORK-MOVE ratio
            let workParts = Math.min(40, Math.floor((8/9 * energy) / 100))
            let moveParts = Math.min(10, Math.floor((1/9 * energy) / 50))
            return ([] as BodyPartConstant[]).concat(
                Array(workParts).fill(WORK),
                Array(moveParts).fill(MOVE)
            )
        }
    },
    [MinionTypes.GUARD]: (energy: number) => {
        if (energy < 200) {
            return [];
        }
        else {
            // Try to maintain ATTACK/MOVE ratio
            let attackParts = Math.min(25, Math.floor(((80/130) * energy) / 80))
            return ([] as BodyPartConstant[]).concat(
                Array(attackParts).fill(ATTACK),
                Array(attackParts).fill(MOVE),
            )
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
            return [CLAIM, MOVE, MOVE, MOVE, MOVE, MOVE]
        }
    },
    [MinionTypes.MARKETER]:  (energy: number) => {
        if (energy < 650) {
            return [];
        }
        else {
            // Equal claim and move parts
            let segments = Math.floor(energy / (BODYPART_COST[CLAIM] + BODYPART_COST[MOVE]));
            return Array(segments).fill([CLAIM, MOVE]).flat()
        }
    },
    [MinionTypes.PARALEGAL]: (energy: number) => {
        if (energy < 250) {
            return [];
        }
        else {
            // Max for an upgrader at RCL8 is 15 energy/tick, so we'll cap these there
            let workParts = Math.max(1, Math.min(15, Math.floor(((energy) * 10/13) / 100)))
            let carryParts = Math.max(1, Math.min(3, Math.floor(((energy) * 1/13) / 50)))
            let moveParts = Math.max(1, Math.min(6, Math.floor(((energy) * 2/13) / 50)))
            return ([] as BodyPartConstant[]).concat(
                Array(workParts).fill(WORK),
                Array(carryParts).fill(CARRY),
                Array(moveParts).fill(MOVE)
            )
        }
    },
    [MinionTypes.SALESMAN]: (energy: number) => {
        if (energy < 200) {
            return [];
        } else if (energy <= 300) {
            return [WORK, WORK, MOVE]
        } else {
            let moveParts = (energy <= 550) ? 1 : 2;
            let carryParts = (energy <= 550) ? 0 : 1;
            let workParts = Math.min(5, Math.floor((energy - (moveParts + carryParts) * 50) / 100));
            return ([] as BodyPartConstant[]).concat(
                Array(workParts).fill(WORK),
                Array(moveParts).fill(MOVE),
                Array(carryParts).fill(CARRY),
            )
        }
    }
}

