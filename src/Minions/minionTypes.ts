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
    INTERN = 'INTERN',
    LAWYER = 'LAWYER',
    PARALEGAL = 'PARALEGAL',
    SALESMAN = 'SALESMAN'
}

export const MinionBuilders: Record<MinionTypes, (energy: number) => BodyPartConstant[]> = {
    [MinionTypes.ACCOUNTANT]: (energy: number) => {
        // 2/3 CARRY, 1/3 MOVE
        let moveParts = Math.min(16, Math.floor(energy/3/50))
        let carryParts = Math.min(32, 2 * moveParts);

        return [...Array(carryParts).fill(CARRY), ...Array(moveParts).fill(MOVE)];
    },
    [MinionTypes.ENGINEER]: (energy: number) => {
        if (energy < 200) {
            return [];
        }
        else {
            // Try to maintain WORK/CARRY/MOVE ratio
            let workParts = Math.min(25, Math.floor(((1/2) * energy) / 100))
            let carryMoveParts = Math.min(12, Math.floor(((1/4) * energy) / 50))
            return [
                ...Array(workParts).fill(WORK),
                ...Array(carryMoveParts).fill(CARRY),
                ...Array(carryMoveParts).fill(MOVE)
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
            let attackParts = Math.min(25, Math.floor(((1/2) * energy) / 80))
            return [
                ...Array(attackParts).fill(ATTACK),
                ...Array(attackParts).fill(MOVE),
            ]
        }
    },
    [MinionTypes.INTERN]: (energy: number) => {
        return [TOUGH, TOUGH, MOVE, MOVE, MOVE, MOVE];
    },
    [MinionTypes.LAWYER]:  (energy: number) => {
        if (energy < 850) {
            return [];
        }
        else {
            // Equal claim and move parts
            let claimParts = 1;
            let moveParts = claimParts * 5;
            return [
                ...Array(claimParts).fill(CLAIM),
                ...Array(moveParts).fill(MOVE),
            ]
        }
    },
    [MinionTypes.PARALEGAL]: (energy: number) => {
        if (energy < 250) {
            return [];
        }
        else {
            // Max for an upgrader at RCL8 is 15 energy/tick, so we'll cap these there
            let workParts = Math.floor(((energy - 50) * 3/4) / 100)
            let moveParts = Math.floor(((energy - 50) * 1/4) / 50)
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
