import { Dashboard, Rectangle, Table } from "screeps-viz";

export default () => {
    for (const room in Memory.stats?.offices ?? []) {
        let totalValue = 0;
        let totalAssigned = 0;
        let table = [];
        for (let o in Memory.stats.offices[room].objectives) {
            table.push([
                o,
                Memory.stats.offices[room].objectives[o].priority.toFixed(3),
                Memory.stats.offices[room].objectives[o].energy.toFixed(2),
                Memory.stats.offices[room].objectives[o].assigned,
            ])
            totalValue += Memory.stats.offices[room].objectives[o].energy;
            totalAssigned += Memory.stats.offices[room].objectives[o].assigned;
        }
        table.push(['---', '---', '---', '---'])
        table.push([
            'Totals',
            '',
            totalValue.toFixed(2),
            totalAssigned,
        ])
        Dashboard({
            widgets: [
                {
                    pos: { x: 1, y: 1 },
                    width: 30,
                    height: Math.min(48, table.length * 2),
                    widget: Rectangle({ data: Table({
                        config: { headers: ['Objective', 'Priority', 'Energy Value', 'Assigned'] },
                        data: table
                    }) })
                }
            ],
            config: { room }
        })
    }
}
