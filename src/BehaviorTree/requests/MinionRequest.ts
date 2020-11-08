import { CachedCreep } from "WorldState";
import { Request } from "BehaviorTree/Request";

export abstract class MinionRequest extends Request<CachedCreep> {
    abstract pos: RoomPosition;
}
