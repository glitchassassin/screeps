import 'reflect-metadata';
import { mockGlobal, mockInstanceOf } from 'screeps-jest';
import {assert} from "chai";
import { resolveTaskTrees, TaskPlan } from "tasks/resolveTaskTrees";
import { TaskAction } from './TaskAction';
import { BuildTask } from './types/BuildTask';
import { HarvestTask } from './types/HarvestTask';
import { TransferTask } from './types/TransferTask';
import { TravelTask } from './types/TravelTask';
import { UpgradeTask } from './types/UpgradeTask';
import { WithdrawTask } from './types/WithdrawTask';

describe("TaskActions-integration", () => {
  beforeEach(() => {
    // runs before each test in this block
    mockGlobal<Game>('Game', {
      creeps: {},
      rooms: {},
      spawns: {},
      time: 12345
    }, true)
    mockGlobal<Memory>('Memory', {
      creeps: {},
    }, true)
    mockGlobal<PathFinder>('PathFinder', {
      search: () => ({cost: 1})
    }, true)
  });

  it("should validate BuildTask", () => {
    let minion = {
      output: 0,
      capacity: 50,
      capacityUsed: 50,
      pos: mockInstanceOf<RoomPosition>({
        x: 0,
        y: 0,
        roomName: 'world',
        inRangeTo: () => true
      }),
      creep: mockInstanceOf<Creep>({
        id: 'creep' as Id<Creep>,
        getActiveBodyparts: () => 1
      }),
    }
    let site = mockInstanceOf<ConstructionSite>({
      pos: mockInstanceOf<RoomPosition>({x: 1, y: 1, roomName: 'world'}),
      progressTotal: 5000,
      progress: 2500
    }, true)
    let result = resolveTaskTrees(minion, new BuildTask(site))
    expect(result).not.toBeNull();
    expect(result).toHaveLength(1);
    expect((result as TaskPlan[])[0]).toMatchObject({
      cost: 10,
      minion: {
        output: 50,
        capacity: 50,
        capacityUsed: 0
      }
    })
  });

  it("should validate HarvestTask", () => {
    let minion = {
      output: 0,
      capacity: 50,
      capacityUsed: 0,
      pos: mockInstanceOf<RoomPosition>({
        x: 0,
        y: 0,
        roomName: 'world',
        inRangeTo: () => true
      }),
      creep: mockInstanceOf<Creep>({
        id: 'creep' as Id<Creep>,
        getActiveBodyparts: () => 1
      }),
    }
    let source = mockInstanceOf<Source>({
      pos: mockInstanceOf<RoomPosition>({x: 1, y: 1, roomName: 'world'}),
      progressTotal: 5000,
      progress: 2500
    }, true)
    let result = resolveTaskTrees(minion, new HarvestTask(source))
    expect(result).not.toBeNull();
    expect(result).toHaveLength(1);
    expect((result as TaskPlan[])[0]).toMatchObject({
      cost: 0.5, // This will change when we get a more accurate cost estimate
      minion: {
        output: 0,
        capacity: 50,
        capacityUsed: 50
      }
    })
  });

  it("should validate TransferTask", () => {
    let minion = {
      output: 0,
      capacity: 50,
      capacityUsed: 50,
      pos: mockInstanceOf<RoomPosition>({
        x: 0,
        y: 0,
        roomName: 'world',
        inRangeTo: () => true
      }),
      creep: mockInstanceOf<Creep>({
        id: 'creep' as Id<Creep>,
        getActiveBodyparts: () => 1
      }),
    }
    let container = mockInstanceOf<StructureContainer>({
      pos: mockInstanceOf<RoomPosition>({x: 1, y: 1, roomName: 'world'}),
      store: mockInstanceOf<Store<RESOURCE_ENERGY, false>>({
        getCapacity: () => 100,
        getFreeCapacity: () => 50,
        getUsedCapacity: () => 50,
      })
    }, true)
    let result = resolveTaskTrees(minion, new TransferTask(container))
    expect(result).not.toBeNull();
    expect(result).toHaveLength(1);
    expect((result as TaskPlan[])[0]).toMatchObject({
      cost: 1,
      minion: {
        output: 50,
        capacity: 50,
        capacityUsed: 0
      }
    })
  });

  it("should validate TravelTask", () => {
    let minion = {
      output: 0,
      capacity: 50,
      capacityUsed: 50,
      pos: mockInstanceOf<RoomPosition>({
        x: 0,
        y: 0,
        roomName: 'world',
        inRangeTo: () => true
      }),
      creep: mockInstanceOf<Creep>({
        id: 'creep' as Id<Creep>,
        getActiveBodyparts: () => 1
      }),
    }
    let pos = mockInstanceOf<RoomPosition>({x: 2, y: 2, roomName: 'world'});
    let result = resolveTaskTrees(minion, new TravelTask(pos))
    console.log(result);
    expect(result).not.toBeNull();
    expect(result).toHaveLength(1);
    expect((result as TaskPlan[])[0]).toMatchObject({
      cost: 1,
      minion: {
        output: 0,
        capacity: 50,
        capacityUsed: 50,
        pos: {x: 2, y: 2}
      }
    })
  });

  it("should validate UpgradeTask", () => {
    let minion = {
      output: 0,
      capacity: 50,
      capacityUsed: 50,
      pos: mockInstanceOf<RoomPosition>({
        x: 0,
        y: 0,
        roomName: 'world',
        inRangeTo: () => true
      }),
      creep: mockInstanceOf<Creep>({
        id: 'creep' as Id<Creep>,
        getActiveBodyparts: () => 1
      }),
    }
    let controller = mockInstanceOf<StructureController>({
      pos: mockInstanceOf<RoomPosition>({x: 1, y: 1, roomName: 'world'})
    }, true)
    let result = resolveTaskTrees(minion, new UpgradeTask(controller))
    console.log(result);
    expect(result).not.toBeNull();
    expect(result).toHaveLength(1);
    expect((result as TaskPlan[])[0]).toMatchObject({
      cost: 10,
      minion: {
        output: 50,
        capacity: 50,
        capacityUsed: 0,
        pos: {x: 0, y: 0}
      }
    })
  });

  it("should validate WithdrawTask", () => {
    let minion = {
      output: 0,
      capacity: 50,
      capacityUsed: 0,
      pos: mockInstanceOf<RoomPosition>({
        x: 0,
        y: 0,
        roomName: 'world',
        inRangeTo: () => true
      }),
      creep: mockInstanceOf<Creep>({
        id: 'creep' as Id<Creep>,
        getActiveBodyparts: () => 1
      }),
    }
    let container = mockInstanceOf<StructureContainer>({
      pos: mockInstanceOf<RoomPosition>({x: 1, y: 1, roomName: 'world'}),
      store: mockInstanceOf<Store<RESOURCE_ENERGY, false>>({
        getCapacity: () => 100,
        getFreeCapacity: () => 50,
        getUsedCapacity: () => 50,
      }),
      structureType: STRUCTURE_CONTAINER
    }, true)
    let result = resolveTaskTrees(minion, new WithdrawTask(container))
    expect(result).not.toBeNull();
    expect(result).toHaveLength(1);
    expect((result as TaskPlan[])[0]).toMatchObject({
      cost: 1,
      minion: {
        output: 0,
        capacity: 50,
        capacityUsed: 50
      }
    })
  });
})
