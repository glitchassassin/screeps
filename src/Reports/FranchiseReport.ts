import { Bar, Dashboard } from "screeps-viz";

import { byId } from "Selectors/byId";
import { franchiseEnergyAvailable } from "Selectors/franchiseEnergyAvailable";
import { sourceIds } from "Selectors/roomCache";

export default () => {
    for (let room in Memory.offices) {
        for (let sourceId of sourceIds(room)) {
            let source = byId(sourceId);
            if (!source) continue;
            Dashboard({
                widgets: [
                    {
                        pos: {
                            x: source.pos.x - 2.5,
                            y: source.pos.y - 2.5,
                        },
                        width: 2,
                        height: 5,
                        widget: Bar({
                            data: {
                                value: source.energy,
                                maxValue: source.energyCapacity
                            },
                            config: {
                                style: {
                                    stroke: 'green',
                                    fill: 'green'
                                }
                            }
                        })
                    },
                    {
                        pos: {
                            x: source.pos.x + 0.5,
                            y: source.pos.y - 2.5,
                        },
                        width: 2,
                        height: 5,
                        widget: Bar({
                            data: {
                                value: franchiseEnergyAvailable(sourceId),
                                maxValue: CONTAINER_CAPACITY
                            },
                            config: {
                                style: {
                                    stroke: 'yellow',
                                    fill: 'yellow'
                                }
                            }
                        })
                    },
                ],
                config: { room }
            })
        }
    }
}
