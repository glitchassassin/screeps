import { MinionTypes } from "Minions/minionTypes";
import { Objective } from "./Objective";
import { byId } from "Selectors/byId";
import { moveTo } from "Behaviors/moveTo";
import { roomPlans } from "Selectors/roomPlans";

export class MineObjective extends Objective {
    minionTypes = [MinionTypes.FOREMAN];

    action = (creep: Creep) => {
        const mine = byId(Memory.rooms[creep.memory.office].mineralId);
        if (!mine) return;
        const plan = roomPlans(creep.memory.office)?.office.mine;
        if (!plan?.extractor.structure) return;

        // Prefer to work from container position, fall back to adjacent position
        if (
            !creep.pos.isEqualTo(plan.container.pos) &&
            plan.container.pos.lookFor(LOOK_CREEPS).length === 0
        ) {
            moveTo(plan.container.pos, 0)(creep);
        } else if (!creep.pos.isNearTo(mine.pos!)) {
            moveTo(mine.pos, 1)(creep);
        }

        creep.harvest(mine);
    }
}

