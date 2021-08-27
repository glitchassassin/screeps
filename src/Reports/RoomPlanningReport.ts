import { RoomPlan } from "RoomPlanner";
import { plannedOfficeStructuresByRcl } from "Selectors/plannedStructuresByRcl";
import { roomPlans } from "Selectors/roomPlans";

export default () => {
    for (let room in Memory.roomPlans) {
        plannedOfficeStructuresByRcl(room, 8)
            .sort((a, b) => (
                (a.structureType === STRUCTURE_RAMPART ? -1 : 0) -
                (b.structureType === STRUCTURE_RAMPART ? -1 : 0)
            ))
            .forEach(s => {
                if (room !== s.pos.roomName) console.log(room, s.pos)
                s.visualize()
            });

        const route = roomPlans(room)?.extensions?.extensions.map(e => e.pos) ?? [];
        new RoomVisual(room).poly(route, {stroke: 'magenta', fill: 'transparent'});

        const fill = Memory.roomPlans[room].office ? '#00aa00' : Memory.roomPlans[room].headquarters ? '#aaaa00' : '#333333'

        Game.map.visual.rect(new RoomPosition(1, 1, room), 48, 48, {fill, stroke: 'transparent', opacity: 0.3});

        ['headquarters', 'franchise1', 'franchise2', 'mine', 'labs', 'extensions', 'perimeter']
        .forEach((plan, index) => {
            if (Memory.roomPlans[room][plan as keyof RoomPlan] === undefined) return;
            Game.map.visual.text(
                `${plan}: ${Memory.roomPlans[room][plan as keyof RoomPlan] !== null ? '✓' : '✗'}`,
                new RoomPosition(2, 5 * index + 4, room),
                { fontSize: 4, align: 'left'}
            )
        })

    }
}
