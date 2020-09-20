import { LogisticsAnalyst } from 'analysts/LogisticsAnalyst';
import { MapAnalyst } from 'analysts/MapAnalyst';
import { SourceAnalyst } from 'analysts/SourceAnalyst';
import 'reflect-metadata';
import { mockGlobal, mockInstanceOf } from "screeps-jest";
import { resolveTaskTrees } from "tasks/resolveTaskTrees";
import { TaskAction } from "tasks/TaskAction";
import { TaskRequest } from "tasks/TaskRequest";
import { BuildTask } from "tasks/types/BuildTask";
import { TransferTask } from "tasks/types/TransferTask";
import { WithdrawTask } from "tasks/types/WithdrawTask";
import { inspect } from "util";
import { calculatePreferences, stablematch } from "./stablematch";

describe("stablematch integration", () => {
    beforeEach(() => {
        // runs before each test in this block
        mockGlobal<Game>('Game', {
            creeps: {},
            rooms: {
                world: mockInstanceOf<Room>({
                    getPositionAt: (x: number, y: number) => mockInstanceOf<RoomPosition>({
                        x,
                        y,
                        roomName: 'world',
                        inRangeTo: () => false,
                        look: () => [],
                        lookFor: () => []
                    }, true),
                    find: (findType: FindConstant) => {
                        if (findType === FIND_SOURCES)
                        return [
                            mockInstanceOf<Source>({
                                pos: mockInstanceOf<RoomPosition>({x: 5, y: 5, roomName: 'world'}, true),
                                energyCapacity: 3000
                            }, true)
                        ]
                        if (findType === FIND_STRUCTURES)
                        return [
                            mockInstanceOf<StructureContainer>({
                                pos: mockInstanceOf<RoomPosition>({x: 5, y: 5, roomName: 'world'}, true),
                                store: mockInstanceOf<Store<RESOURCE_ENERGY, false>>({
                                    getCapacity: () => 100,
                                    getFreeCapacity: () => 50,
                                    getUsedCapacity: () => 50,
                                }, true),
                                structureType: STRUCTURE_CONTAINER
                            }, true)
                        ]
                        return [];
                    }
                }, true)
            },
            spawns: {},
            map: {
                getRoomTerrain: () => ({
                    get: () => 0 // Walkable
                })
            },
            time: 12345
        }, true)
        mockGlobal<Memory>('Memory', {
            creeps: {},
        }, true)
        mockGlobal<PathFinder>('PathFinder', {
            search: () => ({cost: 1})
        }, true)
        mockGlobal<{map: MapAnalyst, source: SourceAnalyst, logistics: LogisticsAnalyst}>('analysts', {
            map: new MapAnalyst(),
            source: new SourceAnalyst(),
            logistics: new LogisticsAnalyst()
        })
    });

    it("should calculate preferences for requests and creeps", () => {
        let site = mockInstanceOf<ConstructionSite>({
            id: 'site' as Id<ConstructionSite>,
            progressTotal: 1000,
            progress: 500,
            pos: mockInstanceOf<RoomPosition>({x: 1, y: 1, roomName: 'world'}, true),

        });
        let container = mockInstanceOf<StructureContainer>({
            id: 'site' as Id<StructureContainer>,
            store: mockInstanceOf<Store<RESOURCE_ENERGY, false>>({
                getFreeCapacity: () => 50,
                getUsedCapacity: () => 50,
                getCapacity: () => 100,
            }),
            pos: mockInstanceOf<RoomPosition>({x: 2, y: 2, roomName: 'world'}, true),
        });
        let creep1 = mockInstanceOf<Creep>({
            id: 'creep1' as Id<Creep>,
            store: mockInstanceOf<Store<RESOURCE_ENERGY, false>>({
                getFreeCapacity: () => 50,
                getUsedCapacity: () => 50,
                getCapacity: () => 100,
            }),
            pos: mockInstanceOf<RoomPosition>({x: 2, y: 1, roomName: 'world', inRangeTo: () => true,}, true),
            getActiveBodyparts: () => 1,
            room: Game.rooms.world,
        });
        let creep2 = mockInstanceOf<Creep>({
            id: 'creep2' as Id<Creep>,
            store: mockInstanceOf<Store<RESOURCE_ENERGY, false>>({
                getFreeCapacity: () => 50,
                getUsedCapacity: () => 50,
                getCapacity: () => 100,
            }),
            pos: mockInstanceOf<RoomPosition>({x: 1, y: 2, roomName: 'world', inRangeTo: () => true,}, true),
            getActiveBodyparts: () => 1,
            room: Game.rooms.world,
        });
        let proposers = [
            new TaskRequest('a', new BuildTask(site)),
            new TaskRequest('b', new TransferTask(container))
        ];
        let accepters = [creep1, creep2];

        let result = calculatePreferences(
            proposers,
            accepters,
            (taskRequest, creep) => {
                let paths = resolveTaskTrees({
                    output: 0,
                    creep,
                    capacity: creep.store.getCapacity(),
                    capacityUsed: creep.store.getUsedCapacity(),
                    pos: creep.pos
                }, taskRequest.task as TaskAction)
                let filteredPaths = paths?.filter(c => {
                    // If task plan is null, filter it
                    if (!c) return false;
                    // If task plan has withdraw and transfer loop, filter it
                    let tasks = (c.tasks.filter(t => t instanceof WithdrawTask || t instanceof TransferTask) as (WithdrawTask|TransferTask)[])
                        .map(t => t.destination?.id)
                    if (tasks.length !== new Set(tasks).size) return false;
                    if (c.minion.output == 0) return false;
                    // Otherwise, accept it
                    return true;
                })
                if (!filteredPaths || filteredPaths.length === 0) {
                    return {pRating: Infinity, aRating: Infinity, output: null};
                }
                let bestPlan = filteredPaths.reduce((a, b) => (a && a.cost < b.cost) ? a : b)
                return {
                    pRating: bestPlan.minion.output, // taskRequest cares about the output
                    aRating: bestPlan.cost,          // creep cares about the cost
                    output: bestPlan
                }
            }
        );
        expect(result.proposers.size).toEqual(2);
        expect(result.accepters.size).toEqual(2);
    })

    it("should calculate stable matches for requests and creeps", () => {
        let site = mockInstanceOf<ConstructionSite>({
            id: 'site' as Id<ConstructionSite>,
            progressTotal: 1000,
            progress: 500,
            pos: mockInstanceOf<RoomPosition>({x: 1, y: 1, roomName: 'world'}, true),

        });
        let container = mockInstanceOf<StructureContainer>({
            id: 'site' as Id<StructureContainer>,
            store: mockInstanceOf<Store<RESOURCE_ENERGY, false>>({
                getFreeCapacity: () => 50,
                getUsedCapacity: () => 50,
                getCapacity: () => 100,
            }),
            pos: mockInstanceOf<RoomPosition>({x: 2, y: 2, roomName: 'world'}, true),
        });
        let creep1 = mockInstanceOf<Creep>({
            id: 'creep1' as Id<Creep>,
            store: mockInstanceOf<Store<RESOURCE_ENERGY, false>>({
                getFreeCapacity: () => 50,
                getUsedCapacity: () => 50,
                getCapacity: () => 100,
            }),
            pos: mockInstanceOf<RoomPosition>({x: 2, y: 1, roomName: 'world', inRangeTo: () => true,}, true),
            getActiveBodyparts: () => 1,
            room: Game.rooms.world,
        });
        let creep2 = mockInstanceOf<Creep>({
            id: 'creep2' as Id<Creep>,
            store: mockInstanceOf<Store<RESOURCE_ENERGY, false>>({
                getFreeCapacity: () => 50,
                getUsedCapacity: () => 50,
                getCapacity: () => 100,
            }),
            pos: mockInstanceOf<RoomPosition>({x: 1, y: 2, roomName: 'world', inRangeTo: () => false,}, true),
            getActiveBodyparts: () => 1,
            room: Game.rooms.world,
        });
        let proposers = [
            new TaskRequest('a', new BuildTask(site)),
            new TaskRequest('b', new TransferTask(container))
        ];
        let accepters = [creep1, creep2];

        let result = stablematch(
            proposers,
            accepters,
            (taskRequest, creep) => {
                let paths = resolveTaskTrees({
                    output: 0,
                    creep,
                    capacity: creep.store.getCapacity(),
                    capacityUsed: creep.store.getUsedCapacity(),
                    pos: creep.pos
                }, taskRequest.task as TaskAction)
                let filteredPaths = paths?.filter(c => {
                    // If task plan is null, filter it
                    if (!c) return false;
                    // If task plan has withdraw and transfer loop, filter it
                    let tasks = (c.tasks.filter(t => t instanceof WithdrawTask || t instanceof TransferTask) as (WithdrawTask|TransferTask)[])
                        .map(t => t.destination?.id)
                    if (tasks.length !== new Set(tasks).size) return false;
                    if (c.minion.output == 0) return false;
                    // Otherwise, accept it
                    return true;
                })
                if (!filteredPaths || filteredPaths.length === 0) {
                    return {pRating: Infinity, aRating: Infinity, output: null};
                }
                let bestPlan = filteredPaths.reduce((a, b) => (a && a.cost < b.cost) ? a : b)
                return {
                    pRating: bestPlan.minion.output, // taskRequest cares about the output
                    aRating: bestPlan.cost,          // creep cares about the cost
                    output: bestPlan
                }
            }
        );
        // console.log(inspect(result, {depth: 2}));
        expect(result.length).toEqual(2);
        expect(result[0][0].id).toEqual('creep2');
        expect(result[0][1].sourceId).toEqual('a');
        expect(result[1][0].id).toEqual('creep1');
        expect(result[1][1].sourceId).toEqual('b');
    })
})
