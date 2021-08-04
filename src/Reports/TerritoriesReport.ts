import { TerritoryIntent, getTerritoryIntent } from "Selectors/territoryIntent";

const colors = {
    [TerritoryIntent.ACQUIRE]: '#00ff00',
    [TerritoryIntent.AVOID]: '#ff0000',
    [TerritoryIntent.DEFEND]: '#0000ff',
    [TerritoryIntent.EXPLOIT]: '#ffff00',
    [TerritoryIntent.IGNORE]: '#333333',
}

export default () => {
    for (let room in Memory.rooms) {
        const intent = getTerritoryIntent(room);
        Game.map.visual.rect(new RoomPosition(1, 1, room), 48, 48, {fill: colors[intent], stroke: 'transparent', opacity: 0.5});
    }
}
