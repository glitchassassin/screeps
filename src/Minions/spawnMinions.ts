import { MinionBuilders, MinionTypes } from "./minionTypes";

import { CreepCount } from "Selectors/creepCounter";
import { Metrics } from "screeps-viz";
import { heapMetrics } from "Metrics/recordMetrics";
import { spawnBudget } from "./spawnBudget";
import { spawnTargets } from "./spawnStrategy";
import { spawns } from "Selectors/roomPlans";

declare global {
    interface CreepMemory {
        office: string,
        type: MinionTypes,
    }
}

export const spawnMinions = (room: string, creepCount: CreepCount) => {
    const targets = spawnTargets(room);
    const availableSpawns = spawns(room).filter(s => !s.spawning);
    const minionsToSpawn: MinionTypes[] = [];

    // If possible, use max energy; otherwise, if it takes longer than
    // 200 ticks, use whatever energy is available.
    let energyToUse = heapMetrics[room] ? Metrics.max(heapMetrics[room].roomEnergy)[1] : Game.rooms[room].energyCapacityAvailable;

    // Update metrics
    if (Memory.stats?.offices?.[room]) {
        for (let m of Object.values(MinionTypes)) {
            Memory.stats.offices[room].minions ??= {}
            Memory.stats.offices[room].minions[m] = {
                target: targets[m] ?? 0,
                actual: creepCount[room]?.[m] ?? 0,
            }
            Memory.stats.offices[room].spawnBudget = spawnBudget(energyToUse, targets);
        }
    }

    // Priority minions
    const setSpawnMinions = (priorityMinions: MinionTypes[]) => {
        while (minionsToSpawn.length < availableSpawns.length) {
            let pressure = 1;
            let minion: MinionTypes | undefined = undefined;
            for (let m of priorityMinions) {
                const target = targets[m];
                const actual = creepCount[room]?.[m] ?? 0;
                if (target && actual / target < pressure) {
                    minion = m;
                    pressure = actual / target;
                }
            }
            if (minion) {
                minionsToSpawn.push(minion);
                creepCount[room] ??= {}
                creepCount[room][minion] ??= 0;
                creepCount[room][minion] += 1;
            } else {
                break;
            }
        }
    }

    if (Game.rooms[room].controller?.level === 1) {
        setSpawnMinions([MinionTypes.SALESMAN, MinionTypes.ENGINEER, MinionTypes.ACCOUNTANT]);
    } else {
        setSpawnMinions([MinionTypes.SALESMAN, MinionTypes.ACCOUNTANT]);
    }
    setSpawnMinions(Object.values(MinionTypes));

    // Spawn minions
    minionsToSpawn.forEach((minion, i) => {
        availableSpawns[i].spawnCreep(
            MinionBuilders[minion](energyToUse),
            `${minion}${Game.time}`,
            {
                memory: {
                    type: minion,
                    office: room
                }
            }
        )
    })
}
