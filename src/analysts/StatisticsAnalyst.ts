import { stringify } from "querystring";
import { Analyst } from "./Analyst";

export class StatisticsAnalyst extends Analyst {
    taskManagementStats(room: string) {
        let taskCount: {[id: string]: number} = {};
        global.supervisors[room].task.tasks.forEach(t => {
            let name = t.actions[0].constructor.name;
            taskCount[name] = 1 + (taskCount[name] || 0);
        });

        let requestCount: {[id: string]: number} = {};
        global.supervisors[room].task.getRequestsFlattened().forEach(r => {
            if (!r.task) return;
            let name = r.task.constructor.name;
            requestCount[name] = 1 + (requestCount[name] || 0);
        });
        return {
            tasks: taskCount,
            requests: requestCount
        }
    }
    exportStats() {
        const rooms: {[id: string]: {
            taskManagement: {
                tasks: {[id: string]: number},
                requests: {[id: string]: number},
            },
            controllerProgress: number;
            controllerProgressTotal: number;
            controllerLevel: number; }
        } = {};
        for (let roomName in Game.rooms) {
            let room = Game.rooms[roomName];
            if (room.controller?.my) {
                rooms[roomName] = {
                    taskManagement: this.taskManagementStats(roomName),
                    controllerProgress: room.controller.progress,
                    controllerProgressTotal: room.controller.progressTotal,
                    controllerLevel: room.controller.level,
                }
            }
        }
        // Reset stats object
        Memory.stats = {
          gcl: {
            progress: Game.gcl.progress,
            progressTotal: Game.gcl.progressTotal,
            level: Game.gcl.level,
          },
          rooms,
          cpu: {
            bucket: Game.cpu.bucket,
            limit: Game.cpu.limit,
            used: Game.cpu.getUsed(),
          },
          time: Game.time,
        };
      }
}
