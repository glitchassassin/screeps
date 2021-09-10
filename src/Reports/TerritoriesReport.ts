import { Dashboard, Rectangle, Table } from "screeps-viz";
import { getTerritoriesByOffice } from "Selectors/getTerritoriesByOffice";
import { getTerritoryIntent, TerritoryIntent } from "Selectors/territoryIntent";

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
    for (let office in Memory.offices) {
        const territories = getTerritoriesByOffice(office);
        // territories.forEach(territory => {
        //     Game.map.visual.line(new RoomPosition(25, 25, office), new RoomPosition(25, 25, territory), { color: '#ffffff', width: 5 })
        // })

        Dashboard({
            config: { room: office },
            widgets: [
                {
                    pos: { x: 1, y: 1, },
                    width: 35,
                    height: 15,
                    widget: Rectangle({ data: Table({
                        data: territories.map(t => {
                            const data = Memory.rooms[t].territory;
                            const reserved = Memory.rooms[t].reserver === 'LordGreywether'
                            if (!data) return [t, '--', '--', '--', '--']
                            return [
                                t,
                                data.sources,
                                reserved ? data.spawnCapacityReserved : data.spawnCapacity,
                                reserved ? data.targetCarryReserved: data.targetCarry,
                                data.disabled ? data.disabled - Game.time : '',
                            ]
                        }),
                        config: {
                            headers: ['Territory', 'Sources', 'Spawn Capacity (ticks)', 'Target Carry', 'Disabled']
                        }
                    })})
                }
            ]
        })
    }
}
