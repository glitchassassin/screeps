import { Behavior, Sequence } from "BehaviorTree/Behavior";

import { CachedSpawn } from "WorldState";
import { Minion } from "MinionDefinitions/Minion";
import { Request } from "BehaviorTree/Request";
import { calcMaxRoomEnergy } from "BehaviorTree/behaviors/calcMaxRoomEnergy";
import profiler from "screeps-profiler";
import { spawnMinion } from "BehaviorTree/behaviors/spawnMinion";

export class SpawnRequest extends Request<CachedSpawn> {
    public action: Behavior<CachedSpawn>;
    public type: string;

    constructor(minion: Minion) {
        super();
        this.type = minion.type;
        this.action = Sequence(
            calcMaxRoomEnergy(),
            spawnMinion(minion)
        )
    }

    // Assign one spawn to the request
    meetsCapacity(assigned: CachedSpawn[]) { return assigned.length > 0; }
    canBeFulfilledBy(spawn: CachedSpawn) {
        return ( !spawn.gameObj?.spawning );
    }

}
profiler.registerClass(SpawnRequest, 'SpawnRequest');
