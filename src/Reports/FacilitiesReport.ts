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
                    new RoomVisual(room).rect(s.pos.x - 1, s.pos.y - 1, 2, 2, { stroke: 'yellow', fill: 'transparent', lineStyle: 'dashed' })
                }
            });
    }
}
