import { Dashboard, Rectangle, Table } from "screeps-viz";

import { FranchiseObjective } from "Objectives/Franchise";
import { PrioritizedObjectives } from "Objectives/initializeObjectives";
import { byId } from "Selectors/byId";

export default () => {
    for (const room in Memory.offices) {
        const objectives = PrioritizedObjectives.filter(o => !(o instanceof FranchiseObjective) || (!o.disabled && o.office === room));
        const table = [];
        let totalValue = 0;
        let totalAssigned = 0;
        for (let o of objectives) {
            let value = o.energyValue(room);
            let assigned = o.assigned.map(byId).filter(c => c?.memory.office === room).length
            table.push([
                o.id,
                o.priority.toFixed(3),
                value.toFixed(2),
                assigned,
            ])
            totalValue += value;
            totalAssigned += assigned;
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
                    height: Math.min(48, objectives.length * 2),
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
