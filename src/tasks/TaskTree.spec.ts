import 'reflect-metadata';
import { mockGlobal, mockInstanceOf } from 'screeps-jest';
import {assert} from "chai";
import { Task, TaskPrerequisite } from "tasks/Task";
import { resolveTaskTrees } from "tasks/TaskTree";

class MockTaskPrerequisite extends TaskPrerequisite {
  constructor(
    public metReturn: boolean,
    public toMeetTasks: Task[]|null = null
  ) { super(); }
  met = () => this.metReturn;
  toMeet = () => this.toMeetTasks;
}

describe("TaskTree", () => {
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
  });

  it("should run", () => {
    let minion = {
      capacity: 0,
      capacityUsed: 0,
      pos: mockInstanceOf<RoomPosition>({x: 0, y: 0, roomName: 'world'}),
      creep: mockInstanceOf<Creep>({id: 'creep' as Id<Creep>}),
    }
    let result = resolveTaskTrees(minion, new Task(minion.creep))
    assert.isOk(result);
  });

  it("should return the task if the task has a met prerequisite", () => {
    let minion = {
      capacity: 0,
      capacityUsed: 0,
      pos: mockInstanceOf<RoomPosition>({x: 0, y: 0, roomName: 'world'}),
      creep: mockInstanceOf<Creep>({id: 'creep' as Id<Creep>}),
    }
    let task = new Task(minion.creep);
    task.getPrereqs = () => ([new MockTaskPrerequisite(true)])
    let result = resolveTaskTrees(minion, new Task(minion.creep))
    expect(result).not.toBeNull();
    if (result === null) throw new Error();
    expect(result.length).toEqual(1);
    expect(result[0].tasks.length).toEqual(1);
  })

  it("should return null if the task has an un-meetable prerequisite", () => {
    let minion = {
      capacity: 0,
      capacityUsed: 0,
      pos: mockInstanceOf<RoomPosition>({x: 0, y: 0, roomName: 'world'}, true),
      creep: mockInstanceOf<Creep>({id: 'creep' as Id<Creep>}, true),
    }
    let task = new Task(minion.creep);
    task.getPrereqs = () => ([new MockTaskPrerequisite(false)])
    let result = resolveTaskTrees(minion, task)
    expect(result).toBeNull();
  })

  it("should return the task plus prerequisite if the task has a meetable prerequisite", () => {
    let minion = {
      capacity: 0,
      capacityUsed: 0,
      pos: mockInstanceOf<RoomPosition>({x: 0, y: 0, roomName: 'world'}),
      creep: mockInstanceOf<Creep>({id: 'creep' as Id<Creep>}),
    }
    let task = new Task(minion.creep);
    let prereqTask = new Task(minion.creep);
    task.getPrereqs = () => ([new MockTaskPrerequisite(false, [prereqTask])])
    let result = resolveTaskTrees(minion, task)
    expect(result).not.toBeNull();
    if (result === null) throw new Error();
    expect(result.length).toEqual(1);
    expect(result[0].tasks.length).toEqual(2);
  })

  it("should calculate nested prerequisites", () => {
    let minion = {
      capacity: 0,
      capacityUsed: 0,
      pos: mockInstanceOf<RoomPosition>({x: 0, y: 0, roomName: 'world'}),
      creep: mockInstanceOf<Creep>({id: 'creep' as Id<Creep>}),
    }
    let task = new Task(minion.creep);
    let prereqTask = new Task(minion.creep);
    let tertiaryTask = new Task(minion.creep);
    task.getPrereqs = () => ([new MockTaskPrerequisite(false, [prereqTask])])
    prereqTask.getPrereqs = () => ([new MockTaskPrerequisite(false, [tertiaryTask])])
    let result = resolveTaskTrees(minion, task)
    console.log(result);
    expect(result).not.toBeNull();
    if (result === null) throw new Error();
    expect(result.length).toEqual(1);
    expect(result[0].tasks.length).toEqual(3);
  })

  it("should calculate alternative prerequisites", () => {
    let minion = {
      capacity: 0,
      capacityUsed: 0,
      pos: mockInstanceOf<RoomPosition>({x: 0, y: 0, roomName: 'world'}),
      creep: mockInstanceOf<Creep>({id: 'creep' as Id<Creep>}),
    }
    let task = new Task(minion.creep);
    task.cost = () => 1;
    let prereqTask = new Task(minion.creep);
    prereqTask.cost = () => 2;
    let tertiaryTask = new Task(minion.creep);
    tertiaryTask.cost = () => 3;
    task.getPrereqs = () => ([new MockTaskPrerequisite(false, [prereqTask, tertiaryTask])])
    let result = resolveTaskTrees(minion, task)
    expect(result).not.toBeNull();
    if (result === null) throw new Error();
    expect(result.length).toEqual(2);
    expect(result[0].tasks.length).toEqual(2);
    expect(result[0].cost).toEqual(3);
    expect(result[1].cost).toEqual(4);
  })
});
