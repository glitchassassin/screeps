import { Request } from "BehaviorTree/Request";

export abstract class MinionRequest extends Request<Creep> {
    abstract pos: RoomPosition;
    minionType?: string;
}
