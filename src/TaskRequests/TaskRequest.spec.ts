import 'reflect-metadata';
import { mockGlobal, mockInstanceOf } from 'screeps-jest';
import {assert} from "chai";
import { Task } from "TaskRequests/Task";
import { TaskPrerequisite } from "TaskRequests/TaskPrerequisite";
import { resolveTaskTrees } from "TaskRequests/resolveTaskTrees";
import { TaskAction } from './TaskAction';
import { TaskRequest } from './TaskRequest';
import { deserialize, serialize } from 'class-transformer';

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

  it("should serialize", () => {
      expect(serialize( new TaskRequest("test", new TaskAction())))
        .toEqual('{"completed":false,"created":12345,"sourceId":"test","priority":5,"task":{"message":"☑","__type":"TaskAction"}}');
  });

  it("should deserialize", () => {
      let json = serialize( new TaskRequest("test", new TaskAction()));
      let deserialized = deserialize(TaskRequest, json);
      expect(deserialized).toBeInstanceOf(TaskRequest);
      expect(deserialized.task).toBeInstanceOf(TaskAction);
  });
});
