import { BehaviorResult, Blackboard } from "BehaviorTree/Behavior";

import { MinionRequest } from "BehaviorTree/requests/MinionRequest";
import { Office } from "Office/Office";
import { OfficeTaskManager } from "Office/OfficeManagers/OfficeTaskManager";
import { Request } from "BehaviorTree/Request";

declare module 'BehaviorTree/Behavior' {
    interface Blackboard {
        pendingRequest?: Request<any>
    }
}

/**
 * Returns FAILURE if manager is invalid
 * If a minion request is pending, returns its status
 * Otherwise, submits the request and returns INPROGRESS
 */
export const assignMinionRequest = (managerName: string, request: MinionRequest) => (office: Office, bb: Blackboard) => {
    let manager = office.managers.get(managerName);
    if (!(manager instanceof OfficeTaskManager)) return BehaviorResult.FAILURE;

    if (bb.pendingRequest && bb.pendingRequest.result) {
        return bb.pendingRequest.result;
    }

    if (!bb.pendingRequest) {
        manager.submit(request);
    }

    return BehaviorResult.INPROGRESS;
}
