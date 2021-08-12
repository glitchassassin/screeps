import { FranchiseObjective } from "Objectives/Franchise";
import { Objectives } from "Objectives/Objective";
import { Bar, Dashboard } from "screeps-viz";
import { byId } from "Selectors/byId";
import { franchiseEnergyAvailable } from "Selectors/franchiseEnergyAvailable";
import { posById } from "Selectors/posById";
import { roomPlans } from "Selectors/roomPlans";


export default () => {
    // Objectives
    for (let o in Objectives) {
        let objective = Objectives[o];
        if (!(objective instanceof FranchiseObjective)) continue;

        let sourcePos = posById(objective.sourceId);
        let storagePos = roomPlans(objective.office)?.office?.headquarters.storage.pos;
        if (sourcePos && storagePos) {
            Game.map.visual.line(sourcePos, storagePos, {
                color: objective.disabled ? '#cccccc' : '#ffff00',
                lineStyle: objective.disabled ? 'dashed' : 'solid',
            });
            if (!objective.disabled) {
                Game.map.visual.text(`${objective.assigned.length}`, new RoomPosition(sourcePos.x, Math.max(0, sourcePos.y - 5), sourcePos.roomName), {fontSize: 5});
                Game.map.visual.text(objective.energyValue(objective.office).toFixed(2), new RoomPosition(sourcePos.x, Math.min(50, sourcePos.y + 5), sourcePos.roomName), {fontSize: 5});
            }
        }

        let source = byId(objective.sourceId);
        if (!source) continue;
        Dashboard({
            widgets: [
                {
                    pos: {
                        x: source.pos.x - 5,
                        y: source.pos.y - 2.5,
                    },
                    width: 2,
                    height: 5,
                    widget: Bar({
                        data: {
                            value: source.ticksToRegeneration ?? 0,
                            maxValue: ENERGY_REGEN_TIME
                        },
                        config: {
                            style: {
                                stroke: 'white',
                                fill: 'white'
                            }
                        }
                    })
                },
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
                            value: franchiseEnergyAvailable(source.id),
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
            config: { room: source.pos.roomName }
        })
    }
}
