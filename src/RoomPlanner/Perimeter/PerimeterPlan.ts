import { PerimeterPlan } from 'RoomPlanner';
import { roomPlans } from 'Selectors/roomPlans';
import util_mincut, { Rect } from '../Algorithms/mincut';
import { PlannedStructure } from '../PlannedStructure';
import { validatePerimeterPlan } from './validatePerimeterPlan';

const getBoundingRect = (...args: PlannedStructure[]) => {
    const rect = {
        x1: 50,
        y1: 50,
        x2: 0,
        y2: 0
    }
    for (let s of args) {
        rect.x1 = Math.min(s.pos.x, rect.x1)
        rect.y1 = Math.min(s.pos.y, rect.y1)
        rect.x2 = Math.max(s.pos.x, rect.x2)
        rect.y2 = Math.max(s.pos.y, rect.y2)
    }
    return padBoundingRect(rect);
}

const padBoundingRect = (rect: Rect, buffer = 2) => {
    return {
        x1: Math.max(rect.x1 - buffer, 2),
        y1: Math.max(rect.y1 - buffer, 2),
        x2: Math.min(rect.x2 + buffer, 47),
        y2: Math.min(rect.y2 + buffer, 47),
    }
}

export const planPerimeter = (room: string) => {
    const roomPlan = roomPlans(room)
    if (!roomPlan?.headquarters || !roomPlan?.labs || !roomPlan?.extensions || !roomPlan.franchise1 || !roomPlan.franchise2) throw new Error('No Office structures found to plot perimeter');
    const plan: Partial<PerimeterPlan> = {
        ramparts: util_mincut.GetCutTiles(room, [
            getBoundingRect(...roomPlan.headquarters.towers),
            getBoundingRect(...roomPlan.extensions.extensions),
            getBoundingRect(...roomPlan.labs.labs),
            getBoundingRect(roomPlan.franchise1.spawn, roomPlan.franchise1.container, roomPlan.franchise1.link),
            getBoundingRect(roomPlan.franchise2.spawn, roomPlan.franchise2.container, roomPlan.franchise2.link),
        ]).map(pos => new PlannedStructure(new RoomPosition(pos.x, pos.y, room), STRUCTURE_RAMPART)),
    }

    return validatePerimeterPlan(plan);
}
