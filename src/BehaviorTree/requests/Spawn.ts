import { Behavior, Sequence } from "BehaviorTree/Behavior";

import { Minion } from "MinionDefinitions/Minion";
import { Request } from "BehaviorTree/Request";
import { calcMaxRoomEnergy } from "BehaviorTree/behaviors/calcMaxRoomEnergy";
import profiler from "screeps-profiler";
import { spawnMinion } from "BehaviorTree/behaviors/spawnMinion";

export class SpawnRequest extends Request<StructureSpawn> {
    public action: Behavior<StructureSpawn>;
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
    meetsCapacity(assigned: StructureSpawn[]) { return assigned.length > 0; }
    canBeFulfilledBy(spawn: StructureSpawn) {
        return ( !spawn.spawning );
    }

}
profiler.registerClass(SpawnRequest, 'SpawnRequest');
