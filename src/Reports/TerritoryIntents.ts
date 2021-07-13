import { DefenseAnalyst, TerritoryIntent } from "Analysts/DefenseAnalyst";

import { RoomData } from "WorldState/Rooms";

const colorMap = {
    [TerritoryIntent.ACQUIRE]: '#00ff00',
    [TerritoryIntent.AVOID]: '#ff0000',
    [TerritoryIntent.DEFEND]: '#ff00ff',
    [TerritoryIntent.EXPLOIT]: '#ffff00',
    [TerritoryIntent.IGNORE]: '#ffffff',
}

export default () => {
    RoomData.all().forEach(room => {
        const intent = DefenseAnalyst.getTerritoryIntent(room.name);
        Game.map.visual.rect(
            new RoomPosition(1, 1, room.name),
            48, 48,
            {
                fill: colorMap[intent],
                opacity: 0.5
            }
        )
        Game.map.visual.text(intent, new RoomPosition(25, 45, room.name), { fontSize: 5 })
    });
}
