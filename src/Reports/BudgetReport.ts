import { BaseBudgetConstraints, Budget, Budgets, TotalBudgetConstraints } from "Budgets";
import { sumBudgets } from "Budgets/sum";
import { Bar, Dashboard, Grid, Rectangle } from "screeps-viz";

/**
 * For each Budgeted Objective:
 * Display budgeted CPU, spawn, energy as proportion of the max
 * Display total budgeted CPU, spawn, energy
 */

export default () => {
    for (let office in Memory.offices) {
        let maxCpu = 0
        let maxSpawn = 0
        let maxEnergy = 0;
        const gridItems = [];
        for (let [id, budget] of Budgets.get(office) ?? []) {
            if (id === 'LogisticsObjective') continue;
            if (budget.cpu > maxCpu) maxCpu = budget.cpu;
            if (budget.spawn > maxSpawn) maxSpawn = budget.spawn;
            if (budget.energy > maxEnergy) maxEnergy = budget.energy;
        }

        const totalBudget = TotalBudgetConstraints.get(office) ?? { cpu: 0, spawn: 0, energy: 0 };
        const baseBudget = BaseBudgetConstraints.get(office) ?? { cpu: 0, spawn: 0, energy: 0 };
        let items: [string, Budget][] = [
            ['Total', totalBudget],
        ]
        let franchiseBudget = { cpu: 0, spawn: 0, energy: 0 };
        for (let [id, budget] of Budgets.get(office) ?? []) {
            if (id.startsWith('Franchise')) {
                franchiseBudget = sumBudgets(budget, franchiseBudget);
            } else {
                items.push([id, budget]);
            }
        }

        for (let [id, budget] of items) {
            let maxBudget = ['Total', 'Base', 'LogisticsObjective'].includes(id) ?
                baseBudget :
                {
                    cpu: maxCpu,
                    spawn: maxSpawn,
                    energy: maxEnergy,
                }
            gridItems.push(Rectangle({ data: Grid({
                config: { columns: 3, rows: 1},
                data: [
                    Bar({
                        data: {
                            value: budget.cpu,
                            maxValue: maxBudget.cpu,
                        },
                        config: {
                            style: {
                                stroke: '#00ff00',
                                fill: '#00ff00'
                            }
                        }
                    }),
                    Bar({
                        data: {
                            value: budget.spawn,
                            maxValue: maxBudget.spawn,
                        },
                        config: {
                            style: {
                                stroke: '#00ffff',
                                fill: '#00ffff'
                            },
                            label: id.replace('Objective', '')
                        }
                    }),
                    Bar({
                        data: {
                            value: budget.energy,
                            maxValue: maxBudget.energy,
                        },
                        config: {
                            style: {
                                stroke: '#ffff00',
                                fill: '#ffff00'
                            }
                        }
                    }),
                ]
            }) }))
        }

        Dashboard({
            config: { room: office },
            widgets: [
                {
                    pos: { x: 1, y: 1 },
                    width: 47,
                    height: 47,
                    widget: Grid({
                        config: {
                            columns: 4,
                            rows: 6
                        },
                        data: gridItems
                    })
                }
            ]
        })
    }
}
