import { minionCost } from "Selectors/minionCostPerTick";
import { memoize } from "utils/memoizeFunction";

export interface Minion {
    body: BodyPartConstant[],
    name: string,
    memory: CreepMemory
}

export enum MinionTypes {
    ACCOUNTANT = 'ACCOUNTANT',
    CLERK = 'CLERK',
    ENGINEER = 'ENGINEER',
    PAVER = 'PAVER',
    FOREMAN = 'FOREMAN',
    GUARD = 'GUARD',
    AUDITOR = 'AUDITOR',
    LAWYER = 'LAWYER',
    PARALEGAL = 'PARALEGAL',
    SALESMAN = 'SALESMAN',
    MARKETER = 'MARKETER',
    BLINKY = 'BLINKY',
    MEDIC = 'MEDIC'
}

interface buildFromSegmentOpts {
    maxSegments: number,
    sorted: boolean,
    suffix: BodyPartConstant[]
}

function buildFromSegment(energy: number, segment: BodyPartConstant[], opts: Partial<buildFromSegmentOpts> = {}) {
    if (segment.length === 0 || energy === 0) return [];
    const actualOpts = {
        maxSegments: Infinity,
        sorted: false,
        suffix: [] as BodyPartConstant[],
        ...opts
    }
    energy -= minionCost(actualOpts.suffix);
    const segmentCost = minionCost(segment);
    const segmentCount = Math.min(
        Math.floor(energy / segmentCost),
        Math.floor(50 / segment.length),
        actualOpts.maxSegments,
    )
    const body = new Array(segmentCount).fill(segment).flat();
    if (actualOpts.sorted) body.sort().reverse();
    body.push(...actualOpts.suffix);
    return body;
}

export const MinionBuilders = {
    [MinionTypes.CLERK]: (energy: number, maxSegments = 50) => {
        return buildFromSegment(energy, [CARRY], { maxSegments });
    },
    [MinionTypes.ACCOUNTANT]: memoize( // Memoizes at 50-energy increments
        (energy: number, maxSegments = 25, roads = false) => `${Math.round(energy * 2 / 100)} ${maxSegments} ${roads}`,
        (energy: number, maxSegments = 25, roads = false) => {
            if (energy < 200 || maxSegments === 0) {
                return [];
            } else if (energy <= 300) {
                return [CARRY, MOVE, CARRY, MOVE]
            } else if (energy < 5600) { // Before we have two spawns, create smaller haulers
                if (!roads) {
                    return buildFromSegment(energy, [CARRY, MOVE], { maxSegments: Math.min(maxSegments, 13) });
                } else {
                    return buildFromSegment(energy, [CARRY, CARRY, MOVE], { maxSegments: Math.min(maxSegments, 13) });
                }
            } else {
                if (!roads) {
                    return buildFromSegment(energy, [CARRY, MOVE], { maxSegments });
                } else {
                    return buildFromSegment(energy, [CARRY, CARRY, MOVE], { maxSegments });
                }
            }
        }
    ),
    [MinionTypes.ENGINEER]: (energy: number, maxSegments = 16) => {
        if (energy < 200) {
            return [];
        }
        else {
            return buildFromSegment(energy, [WORK, MOVE, CARRY], { maxSegments })
        }
    },
    [MinionTypes.PAVER]: (energy: number, maxSegments = 8) => {
        if (energy < 200) {
            return [];
        }
        else {
            return buildFromSegment(energy, [MOVE, CARRY], { maxSegments, suffix: [WORK] })
        }
    },
    [MinionTypes.FOREMAN]: (energy: number) => {
        if (energy < 550) {
            return [];
        }
        else {
            // Maintain 4-1 WORK-MOVE ratio
            return buildFromSegment(energy, [WORK, WORK, WORK, WORK, MOVE])
        }
    },
    [MinionTypes.GUARD]: (energy: number) => {
        if (energy < 200) {
            return [];
        } else if (energy <= 550) {
            return buildFromSegment(energy, [ATTACK, MOVE], { sorted: true })
        } else {
            // Add a heal part
            return buildFromSegment(energy, [ATTACK, MOVE], { sorted: true, suffix: [HEAL] })
        }
    },
    [MinionTypes.AUDITOR]: (energy: number) => {
        return [MOVE];
    },
    [MinionTypes.LAWYER]:  (energy: number) => {
        if (energy < 850) {
            return [];
        } else {
            return [CLAIM, MOVE, MOVE, MOVE, MOVE, MOVE]
        }
    },
    [MinionTypes.MARKETER]:  (energy: number) => {
        if (energy < 650) {
            return [];
        }
        else {
            return buildFromSegment(energy, [CLAIM, MOVE], { maxSegments: 5 })
        }
    },
    [MinionTypes.PARALEGAL]: (energy: number, maxWorkParts = 15) => {
        if (energy < 250 || maxWorkParts <= 0) {
            return [];
        }
        else {
            // Max for an upgrader at RCL8 is 15 energy/tick, so we'll cap these there
            let workParts = Math.max(1, Math.min(Math.floor(maxWorkParts), Math.floor(((energy) * 10/13) / 100)))
            let carryParts = Math.max(1, Math.min(3, Math.floor(((energy) * 1/13) / 50)))
            let moveParts = Math.max(1, Math.min(6, Math.floor(((energy) * 2/13) / 50)))
            // console.log(energy, maxWorkParts, workParts)
            return ([] as BodyPartConstant[]).concat(
                Array(workParts).fill(WORK),
                Array(carryParts).fill(CARRY),
                Array(moveParts).fill(MOVE)
            )
        }
    },
    [MinionTypes.SALESMAN]: (energy: number, carry = false) => {
        if (energy < 200) {
            return [];
        } else if (energy < 550) {
            return carry ? [WORK, WORK, CARRY, MOVE] : [WORK, WORK, MOVE]
        } else if (energy < 600 && carry) {
            return [WORK, WORK, WORK, CARRY, MOVE];
        } else if (energy < 650) {
            return carry ? [WORK, WORK, WORK, WORK, WORK, CARRY, MOVE] : [WORK, WORK, WORK, WORK, WORK, MOVE]
        } else if (energy < 5300) {
            return [WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE]
        } else {
            // At higher RCL, use bigger harvesters to reduce CPU
            return [WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE, MOVE]
        }
    },
    [MinionTypes.BLINKY]: (energy: number) => {
        if (energy < 200) {
            return [];
        } else if (energy < 5600) {
            return buildFromSegment(energy, [RANGED_ATTACK, MOVE], { sorted: true })
        } else {
            return buildFromSegment(energy, [RANGED_ATTACK, MOVE, MOVE, HEAL], { sorted: true })
        }
    },
    [MinionTypes.MEDIC]: (energy: number) => {
        if (energy < 200) {
            return [];
        } else {
            return buildFromSegment(energy, [HEAL, MOVE], { sorted: true })
        }
    }
}

