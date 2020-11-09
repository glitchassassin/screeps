import { BehaviorResult } from "BehaviorTree/Behavior";
import { Office } from "Office/Office";

export const isRclGreaterThan = (level: number) => (office: Office) => {
    let controller = global.worldState.controllers.byRoom.get(office.center.name);

    if (controller && controller.level > level) {
        return BehaviorResult.SUCCESS;
    }

    return BehaviorResult.FAILURE;
}
