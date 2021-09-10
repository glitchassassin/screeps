import { Bar, Dashboard, Grid, Label, Rectangle } from "screeps-viz";
import { BaseBudgetConstraints, FranchiseBudgetConstraints, LogisticsBudgetConstraints, NetBudgetConstraints, ObjectiveBudgetConstraints } from "Selectors/budgets";

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
        for (let [id, budget] of ObjectiveBudgetConstraints.get(office) ?? []) {
            if (budget.cpu > maxCpu) maxCpu = budget.cpu;
            if (budget.spawn > maxSpawn) maxSpawn = budget.spawn;
            if (budget.energy > maxEnergy) maxEnergy = budget.energy;
        }
        for (let [id, budget] of ObjectiveBudgetConstraints.get(office) ?? []) {
            gridItems.push(Rectangle({ data: Grid({
                config: { columns: 1, rows: 2},
                data: [
                    Grid({
                        config: { columns: 3, rows: 1},
                        data: [
                            Bar({
                                data: {
                                    value: budget.cpu,
                                    maxValue: maxCpu,
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
                                    maxValue: maxSpawn,
                                },
                                config: {
                                    style: {
                                        stroke: '#00ffff',
                                        fill: '#00ffff'
                                    }
                                }
                            }),
                            Bar({
                                data: {
                                    value: budget.energy,
                                    maxValue: maxEnergy,
                                },
                                config: {
                                    style: {
                                        stroke: '#ffff00',
                                        fill: '#ffff00'
                                    }
                                }
                            }),
                        ]
                    }),
                    Label({ data: id.replace('Objective', ''), config: { style: { font: 1 } } })
                ]
            }) }))
        }

        const totalBudget = NetBudgetConstraints.get(office);
        const baseBudget = BaseBudgetConstraints.get(office);
        const franchiseBudget = FranchiseBudgetConstraints.get(office);
        const logisticsBudget = LogisticsBudgetConstraints.get(office);

        Dashboard({
            config: { room: office },
            widgets: [
                {
                    pos: { x: 1, y: 1 },
                    width: 15,
                    height: 16,
                    widget: Rectangle({ data: Grid({
                        config: { columns: 1, rows: 2},
                        data: [
                            Grid({
                                config: { columns: 3, rows: 1},
                                data: [
                                    Bar({
                                        data: {
                                            value: franchiseBudget?.cpu ?? 0,
                                            maxValue: baseBudget?.cpu ?? 0,
                                        },
                                        config: {
                                            style: {
                                                stroke: '#00ff00',
                                                fill: '#00ff00',
                                            },
                                            label: 'CPU'
                                        }
                                    }),
                                    Bar({
                                        data: {
                                            value: franchiseBudget?.spawn ?? 0,
                                            maxValue: baseBudget?.spawn ?? 0,
                                        },
                                        config: {
                                            style: {
                                                stroke: '#00ffff',
                                                fill: '#00ffff'
                                            },
                                            label: 'Spawn'
                                        }
                                    }),
                                    Bar({
                                        data: {
                                            value: franchiseBudget?.energy ?? 0,
                                            maxValue: baseBudget?.energy ?? 0,
                                        },
                                        config: {
                                            style: {
                                                stroke: '#ffff00',
                                                fill: '#ffff00'
                                            },
                                            label: 'Energy'
                                        }
                                    }),
                                ]
                            }),
                            Label({ data: 'Franchises', config: { style: { font: 2.5 } } })
                        ]
                    })})
                },
                {
                    pos: { x: 17, y: 1 },
                    width: 15,
                    height: 16,
                    widget: Rectangle({ data: Grid({
                        config: { columns: 1, rows: 2},
                        data: [
                            Grid({
                                config: { columns: 3, rows: 1},
                                data: [
                                    Bar({
                                        data: {
                                            value: logisticsBudget?.cpu ?? 0,
                                            maxValue: baseBudget?.cpu ?? 0,
                                        },
                                        config: {
                                            style: {
                                                stroke: '#00ff00',
                                                fill: '#00ff00',
                                            },
                                            label: 'CPU'
                                        }
                                    }),
                                    Bar({
                                        data: {
                                            value: logisticsBudget?.spawn ?? 0,
                                            maxValue: baseBudget?.spawn ?? 0,
                                        },
                                        config: {
                                            style: {
                                                stroke: '#00ffff',
                                                fill: '#00ffff'
                                            },
                                            label: 'Spawn'
                                        }
                                    }),
                                    Bar({
                                        data: {
                                            value: logisticsBudget?.energy ?? 0,
                                            maxValue: baseBudget?.energy ?? 0,
                                        },
                                        config: {
                                            style: {
                                                stroke: '#ffff00',
                                                fill: '#ffff00'
                                            },
                                            label: 'Energy'
                                        }
                                    }),
                                ]
                            }),
                            Label({ data: 'Logistics', config: { style: { font: 2.5 } } })
                        ]
                    })})
                },
                {
                    pos: { x: 33, y: 1 },
                    width: 15,
                    height: 16,
                    widget: Rectangle({ data: Grid({
                        config: { columns: 1, rows: 2},
                        data: [
                            Grid({
                                config: { columns: 3, rows: 1},
                                data: [
                                    Bar({
                                        data: {
                                            value: totalBudget?.cpu ?? 0,
                                            maxValue: baseBudget?.cpu ?? 0,
                                        },
                                        config: {
                                            style: {
                                                stroke: '#00ff00',
                                                fill: '#00ff00',
                                            },
                                            label: 'CPU'
                                        }
                                    }),
                                    Bar({
                                        data: {
                                            value: totalBudget?.spawn ?? 0,
                                            maxValue: baseBudget?.spawn ?? 0,
                                        },
                                        config: {
                                            style: {
                                                stroke: '#00ffff',
                                                fill: '#00ffff'
                                            },
                                            label: 'Spawn'
                                        }
                                    }),
                                    Bar({
                                        data: {
                                            value: totalBudget?.energy ?? 0,
                                            maxValue: baseBudget?.energy ?? 0,
                                        },
                                        config: {
                                            style: {
                                                stroke: '#ffff00',
                                                fill: '#ffff00'
                                            },
                                            label: 'Energy'
                                        }
                                    }),
                                ]
                            }),
                            Label({ data: 'Total', config: { style: { font: 2.5 } } })
                        ]
                    })})
                },
                {
                    pos: { x: 1, y: 18 },
                    width: 47,
                    height: 30,
                    widget: Grid({
                        config: {
                            columns: 4,
                            rows: 2
                        },
                        data: gridItems
                    })
                }
            ]
        })
    }
}
