import { LogisticsAnalyst } from 'analysts/LogisticsAnalyst';
import { MapAnalyst } from 'analysts/MapAnalyst';
import { SalesAnalyst } from 'analysts/SalesAnalyst';
import 'reflect-metadata';
import { mockGlobal, mockInstanceOf } from 'screeps-jest';
import { resolveTaskTrees, TaskPlan } from "tasks/resolveTaskTrees";
import { BuildTask } from './types/BuildTask';

describe("resolveTaskTrees-integration", () => {
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
        mockGlobal<{map: MapAnalyst, source: SalesAnalyst, logistics: LogisticsAnalyst}>('analysts', {
            map: new MapAnalyst(),
            source: new SalesAnalyst(),
            logistics: new LogisticsAnalyst()
        })
    });

    it("should generate prereqs for BuildTask when minion is full", () => {
        let minion = {
            output: 0,
            capacity: 50,
            capacityUsed: 50,
            pos: mockInstanceOf<RoomPosition>({
                x: 0,
                y: 0,
                roomName: 'world',
                inRangeTo: () => false
            }, true),
            creep: mockInstanceOf<Creep>({
                id: 'creep' as Id<Creep>,
                getActiveBodyparts: () => 1
            }, true),
        }
        let site = mockInstanceOf<ConstructionSite>({
            pos: mockInstanceOf<RoomPosition>({x: 5, y: 5, roomName: 'world', inRangeTo: () => false}, true),
            progressTotal: 5000,
            progress: 2500
        }, true)
        let result = resolveTaskTrees(minion, new BuildTask(site))
        expect(result).not.toBeNull();
        expect(result).toHaveLength(8);
        let bestResult = (result as TaskPlan[]).sort((a, b) => (a.cost - b.cost))[0]
        expect(bestResult).toMatchObject({
            cost: 11,
            minion: {
                output: 50,
                capacity: 50,
                capacityUsed: 0
            }
        })
    });

    it("should generate multiple prereqs for BuildTask if minion is empty and not adjacent", () => {
        let minion = {
            output: 0,
            capacity: 50,
            capacityUsed: 0,
            pos: mockInstanceOf<RoomPosition>({
                x: 0,
                y: 0,
                roomName: 'world',
                inRangeTo: () => false
            }, true),
            creep: mockInstanceOf<Creep>({
                id: 'creep' as Id<Creep>,
                getActiveBodyparts: () => 1,
                room: Game.rooms.world
            }, true),
        }
        let site = mockInstanceOf<ConstructionSite>({
            pos: mockInstanceOf<RoomPosition>({x: 5, y: 5, roomName: 'world', inRangeTo: () => false}, true),
            progressTotal: 5000,
            progress: 2500,
            room: Game.rooms.world
        }, true)
        let result = resolveTaskTrees(minion, new BuildTask(site))
        expect(result).not.toBeNull();
        expect(result).toHaveLength(128);
        let bestResult = (result as TaskPlan[]).sort((a, b) => (a.cost - b.cost))[0]
        expect(bestResult).toMatchObject({
            cost: 12.5,
            minion: {
                output: 50,
                capacity: 50,
                capacityUsed: 0
            }
        })
    });

    it("should generate prereqs for BuildTask if minion is empty and adjacent", () => {
        let minion = {
            output: 0,
            capacity: 50,
            capacityUsed: 0,
            pos: mockInstanceOf<RoomPosition>({
                x: 0,
                y: 0,
                roomName: 'world',
                inRangeTo: () => true
            }, true),
            creep: mockInstanceOf<Creep>({
                id: 'creep' as Id<Creep>,
                getActiveBodyparts: () => 1,
                room: Game.rooms.world
            }, true),
        }
        let site = mockInstanceOf<ConstructionSite>({
            pos: mockInstanceOf<RoomPosition>({x: 5, y: 5, roomName: 'world', inRangeTo: () => true}, true),
            progressTotal: 5000,
            progress: 2500,
            room: Game.rooms.world
        }, true)
        let result = resolveTaskTrees(minion, new BuildTask(site))
        console.log(result);
        expect(result).not.toBeNull();
        expect(result).toHaveLength(2);
        let bestResult = (result as TaskPlan[]).sort((a, b) => (a.cost - b.cost))[0]
        expect(bestResult).toMatchObject({
            cost: 10.5,
            minion: {
                output: 50,
                capacity: 50,
                capacityUsed: 0
            }
        })
    });
})
