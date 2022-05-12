import { Dashboard, Rectangle, Table } from "screeps-viz";

export default () => {
    for (const room in Memory.stats?.offices ?? []) {
        let totalValue = 0;
        let totalUsed = 0;
        let totalAssigned = 0;
        let totalQuota = 0;
        let table = [];
        for (let o in Memory.stats.offices[room].objectives) {
            table.push([
                o,
                Memory.stats.offices[room].objectives[o].priority.toFixed(3),
                Memory.stats.offices[room].objectives[o].energyBudget?.toFixed(2) ?? '--',
                Memory.stats.offices[room].objectives[o].energyUsed?.toFixed(2) ?? '--',
                Memory.stats.offices[room].objectives[o].minions ?? '--',
                Memory.stats.offices[room].objectives[o].spawnQuota ?? '--',
            ])
            totalValue += Memory.stats.offices[room].objectives[o].energyBudget ?? 0;
            totalUsed += Memory.stats.offices[room].objectives[o].energyUsed ?? 0;
            totalAssigned += Memory.stats.offices[room].objectives[o].minions ?? 0;
            totalQuota += Memory.stats.offices[room].objectives[o].spawnQuota ?? 0;
        }
        table.push(['---', '---', '---', '---', '---', '---'])
        table.push([
            'Totals',
            '',
            totalValue.toFixed(2),
            totalUsed.toFixed(2),
            totalAssigned,
            totalQuota,
        ])
        Dashboard({
            widgets: [
                {
                    pos: { x: 1, y: 1 },
                    width: 40,
                    height: Math.min(48, table.length * 2),
                    widget: Rectangle({ data: Table({
                        config: { headers: ['Objective', 'Priority', 'Energy Budget', 'Energy Used', 'Assigned', 'Quota'] },
                        data: table
                    }) })
                }
            ],
            config: { room }
        })
    }
}
