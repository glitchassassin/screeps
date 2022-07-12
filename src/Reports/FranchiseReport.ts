import { HarvestMission } from "Missions/Implementations/Harvest";
import { MissionType } from "Missions/Mission";
import { Bar, Dashboard } from "screeps-viz";
import { byId } from "Selectors/byId";
import { franchiseActive } from "Selectors/franchiseActive";
import { franchiseEnergyAvailable } from "Selectors/franchiseEnergyAvailable";
import { franchisesByOffice } from "Selectors/franchisesByOffice";
import { getFranchiseDistance } from "Selectors/getFranchiseDistance";
import { posById } from "Selectors/posById";
import { roomPlans } from "Selectors/roomPlans";


export default () => {
    for (const office in Memory.offices) {
        const activeMissionsBySource = Memory.offices[office]?.activeMissions.reduce((obj, mission) => {
            if (mission.type !== MissionType.HARVEST) return obj;
            obj[mission.data.source] ??= [];
            obj[mission.data.source].push(mission as HarvestMission);
            return obj;
        }, {} as Record<string, HarvestMission[]>)
        for (const franchise of franchisesByOffice(office)) {
            let sourcePos = posById(franchise.source);
            let storagePos = roomPlans(office)?.headquarters?.storage.pos;
            let assigned = activeMissionsBySource[franchise.source]?.length ?? 0;
            let disabled = !franchiseActive(office, franchise.source);

            if (sourcePos && storagePos) {
                Game.map.visual.line(sourcePos, storagePos, {
                    color: disabled ? '#cccccc' : '#ffff00',
                    lineStyle: disabled ? 'dashed' : 'solid',
                });

                Game.map.visual.text((getFranchiseDistance(office, franchise.source)?.toFixed(0) ?? '--') + '🦶', new RoomPosition(Math.max(0, sourcePos.x), Math.min(49, sourcePos.y + 4), sourcePos.roomName), { fontSize: 5 });
                if (!disabled) {
                    Game.map.visual.text(`${assigned}⛏`, new RoomPosition(sourcePos.x, Math.max(0, sourcePos.y - 5), sourcePos.roomName), { fontSize: 5 });
                    Game.map.visual.text(
                        `${byId(franchise.source)?.energy.toFixed(0) ?? '--'}⚡ ${franchiseEnergyAvailable(franchise.source).toFixed(0)}📦`,
                        new RoomPosition(Math.max(0, sourcePos.x), Math.min(49, sourcePos.y + 10), sourcePos.roomName),
                        { fontSize: 5 }
                    );
                }
            }

            let source = byId(franchise.source);
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
}
