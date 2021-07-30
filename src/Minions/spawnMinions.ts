import { MinionBuilders, MinionTypes } from "./minionTypes";

import { CreepCount } from "Selectors/creepCounter";
import { Metrics } from "Metrics/recordMetrics";
import { Metrics as Viz } from "screeps-viz";
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

    // Priority minions
    const setSpawnMinions = (priorityMinions: MinionTypes[]) => {
        while (minionsToSpawn.length < availableSpawns.length) {
            let pressure = 1;
            let minion: MinionTypes|undefined = undefined;
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

    setSpawnMinions([MinionTypes.SALESMAN, MinionTypes.ACCOUNTANT]);
    setSpawnMinions(Object.values(MinionTypes));

    // Spawn minions
    // If possible, use max energy; otherwise, if it takes longer than
    // 200 ticks, use whatever energy is available.
    let energyToUse = Metrics[room] ? Viz.max(Metrics[room].roomEnergy)[1] : Game.rooms[room].energyCapacityAvailable;
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
