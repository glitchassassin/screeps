import { BARRIER_LEVEL, BARRIER_TYPES } from "config";
import { facilitiesWorkToDo } from "Selectors/facilitiesWorkToDo";

export default () => {
    for (let room in Memory.offices) {
        facilitiesWorkToDo(room)
            .sort((a, b) => (
                (a.structureType === STRUCTURE_RAMPART ? -1 : 0) -
                (b.structureType === STRUCTURE_RAMPART ? -1 : 0)
            ))
            .forEach(s => {
                if (!s.structure) {
                    s.visualize();
                } else {
                    const viz = new RoomVisual(s.pos.roomName);
                    viz.rect(s.pos.x - 1, s.pos.y - 1, 2, 2, { stroke: 'yellow', fill: 'transparent', lineStyle: 'dashed' });
                    const rcl = Game.rooms[s.pos.roomName]?.controller?.level ?? 0;
                    const maxHits = BARRIER_TYPES.includes(s.structureType) ? BARRIER_LEVEL[rcl] : s.structure.hitsMax;
                    viz.text(`${(100 * s.structure.hits / maxHits).toFixed(1)}%`, s.pos.x, s.pos.y)
                }
            });
    }
}
