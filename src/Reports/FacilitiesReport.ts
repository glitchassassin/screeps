import { BARRIER_LEVEL, BARRIER_TYPES } from "config";
import { EngineerMission } from "Missions/Implementations/Engineer";
import { MissionType } from "Missions/Mission";
import { PlannedStructure } from "RoomPlanner/PlannedStructure";
import { Dashboard, Rectangle, Table } from "screeps-viz";
import { facilitiesCostPending, facilitiesWorkToDo } from "Selectors/facilitiesWorkToDo";

export default () => {
    for (let room in Memory.offices) {
        const visited = new Map<PlannedStructure, boolean>();
        const structureTypes: StructureConstant[] = [];
        const workToDo = facilitiesWorkToDo(room)
            .sort((a, b) => (
                (a.structureType === STRUCTURE_RAMPART ? -1 : 0) -
                (b.structureType === STRUCTURE_RAMPART ? -1 : 0)
            ));
        workToDo
            .forEach(s => {
                if (visited.get(s)) console.log('Duplicate planned structure', s.pos);
                visited.set(s, true);
                if (!structureTypes.includes(s.structureType)) structureTypes.push(s.structureType);
                if (!s.structure) {
                    s.visualize();
                } else {
                    const viz = new RoomVisual(s.pos.roomName);
                    viz.rect(s.pos.x - 1, s.pos.y - 1, 2, 2, { stroke: 'yellow', fill: 'transparent', lineStyle: 'dashed' });
                    const rcl = Game.rooms[s.pos.roomName]?.controller?.level ?? 0;
                    const maxHits = BARRIER_TYPES.includes(s.structureType) ? BARRIER_LEVEL[rcl] : s.structure.hitsMax;
                    viz.text(`${(100 * s.structure.hits / maxHits).toFixed(1)}%`, s.pos.x, s.pos.y)
                }
            });

            const data = [
                ...structureTypes.map(t => ['', '', t]),
                ['---', '---', '---'],
                [
                    workToDo.length,
                    facilitiesCostPending(room),
                    ''
                ]
            ];

            Dashboard({
                widgets: [
                    {
                        pos: { x: 1, y: 1 },
                        width: 40,
                        height: 10,
                        widget: Rectangle({ data: Table({
                            config: { headers: ['Count', 'Cost', 'Types'] },
                            data
                        }) })
                    }
                ],
                config: { room }
            })


            Dashboard({
                widgets: [
                    {
                        pos: { x: 1, y: 12 },
                        width: 40,
                        height: 36,
                        widget: Rectangle({ data: Table({
                            config: { headers: ['Minion', 'Status', 'Targets', 'Capacity'] },
                            data: [...Memory.offices[room].activeMissions, ...Memory.offices[room].pendingMissions]
                                .filter((m): m is EngineerMission => m.type === MissionType.ENGINEER)
                                .map(m => ([
                                    m.creepNames[0] ?? '---',
                                    m.status,
                                    m.data.facilitiesTargets.length,
                                    m.data.facilitiesTargets.reduce((sum, {capacity}) => sum + capacity, 0)
                                ]))
                        }) })
                    }
                ],
                config: { room }
            })
    }
}
