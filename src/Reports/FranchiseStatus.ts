import { Bar, Dashboard, Grid, Label, Rectangle, Table } from "screeps-viz";

import { CachedFranchise } from "WorldState/FranchiseData";
import { SalesAnalyst } from "Boardroom/BoardroomManagers/SalesAnalyst";
import { Sources } from "WorldState/Sources";
import { calculateFranchiseSurplus } from "utils/gameObjectSelectors";

const sourceAndSurplusWidget = (franchise: CachedFranchise) => {
    return Rectangle({
        data: Grid({
            data: [
                Bar(() => ({
                    data: {
                        value: (Sources.byId(franchise.id) as Source).energy ?? 0,
                        maxValue: (Sources.byId(franchise.id) as Source).energyCapacity ?? 0
                    },
                    config: {
                        label: `${franchise.pos.roomName}[${franchise.pos.x}, ${franchise.pos.y}]`,
                        style: {
                            fill: 'green',
                            stroke: 'green',
                            lineStyle: (Sources.byId(franchise.id) as Source).energyCapacity ? 'solid' : 'dashed'
                        }
                    }
                })),
                Bar(() => ({
                    data: {
                        value: calculateFranchiseSurplus(franchise),
                        maxValue: CONTAINER_CAPACITY
                    },
                    config: {
                        label: `Surplus`,
                        style: {
                            fill: 'yellow',
                            stroke: 'yellow',
                            lineStyle: franchise.containerId ? 'solid' : 'dashed'
                        }
                    }
                })),
            ],
            config: {
                columns: 2,
                rows: 1
            }
        })
    })
}

export default () => {
    for (let office of global.boardroom.offices.values()) {
        Dashboard({
            config: { room: office.name, },
            widgets: [
                {
                    pos: { x: 1, y: 1 },
                    width: 47,
                    height: 2,
                    widget: Rectangle({ data: Label({ data: 'Franchise Status Report' }) })
                },
                {
                    pos: { x: 1, y: 4 },
                    width: 20,
                    height: 10,
                    widget: Rectangle({ data: Table(() => {
                        let salesAnalyst = office.boardroom.managers.get('SalesAnalyst') as SalesAnalyst;

                        return {
                            data: salesAnalyst.getExploitableFranchises(office).map(franchise => {
                                let source = Sources.byId(franchise.id);
                                let level = (source instanceof Source) ? `${source.energy}/${source.energyCapacity}` : `??`;
                                franchise?.containerPos && new RoomVisual(franchise.containerPos?.roomName).circle(franchise.containerPos, {radius: 0.55, stroke: 'red', fill: 'transparent'});
                                return [
                                    `${franchise.pos.roomName}[${franchise.pos.x}, ${franchise.pos.y}]`,
                                    level,
                                    calculateFranchiseSurplus(franchise),
                                ]
                            }),
                            config: {
                                headers: ['Franchise', 'Level', 'Surplus']
                            }
                        }
                    }) })
                },
                {
                    pos: { x: 1, y: 15 },
                    width: 46,
                    height: 30,
                    widget: Grid(() => {
                        let salesAnalyst = office.boardroom.managers.get('SalesAnalyst') as SalesAnalyst;
                        return {
                            data: salesAnalyst.getExploitableFranchises(office).map(franchise => sourceAndSurplusWidget(franchise)),
                            config: {
                                columns: 4,
                                rows: 3
                            }
                        }
                    })
                },
            ],
        });
    }
}
