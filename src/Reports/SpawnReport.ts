import { Dashboard, Rectangle, Table } from "screeps-viz";

import { MinionTypes } from "Minions/minionTypes";

export default () => {
    for (let room in Memory.offices) {
        const minionTypes = Object.values(MinionTypes);
        Dashboard({
            widgets: [
                {
                    pos: { x: 1, y: 1 },
                    width: 15,
                    height: minionTypes.length + 3,
                    widget: Rectangle({ data: Table({
                        config: { headers: ['Minion', 'Target', 'Actual'] },
                        data: minionTypes.map(m => [
                            m,
                            Memory.stats?.offices?.[room].minions?.[m].target ?? '--',
                            Memory.stats?.offices?.[room].minions?.[m].actual ?? '--',
                        ])
                    }) })
                }
            ],
            config: { room }
        })
    }
}
