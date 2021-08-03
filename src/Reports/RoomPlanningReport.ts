import { plannedStructuresByRcl } from "Selectors/plannedStructuresByRcl";
import { roomPlans } from "Selectors/roomPlans";

export default () => {
    for (let room in Memory.offices) {
        plannedStructuresByRcl(room, 8)
            .sort((a, b) => (
                (a.structureType === STRUCTURE_RAMPART ? -1 : 0) -
                (b.structureType === STRUCTURE_RAMPART ? -1 : 0)
            ))
            .forEach(s => s.visualize());

        const route = roomPlans(room)?.office.extensions.extensions.map(e => e.pos) ?? [];
        new RoomVisual(room).poly(route, {stroke: 'magenta', fill: 'transparent'});
    }
}
