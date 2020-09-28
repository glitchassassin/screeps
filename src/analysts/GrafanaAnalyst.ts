import { stringify } from "querystring";
import { Analyst } from "./Analyst";

export class GrafanaAnalyst extends Analyst {
    deltas: {
        [id: string]: {
            building: number,
            repairing: number,
            healing: number,
            attacking: number,
        }
    } = {};
    load = (room: Room) => {
        this.deltas[room.name] = {
            building: 0,
            repairing: 0,
            healing: 0,
            attacking: 0,
        }
    }
    reportBuild(room: Room, delta: number) {
        this.deltas[room.name].building += delta;
    }
    reportRepair(room: Room, delta: number) {
        this.deltas[room.name].repairing += delta;
    }
    reportHeal(room: Room, delta: number) {
        this.deltas[room.name].healing += delta;
    }
    reportAttack(room: Room, delta: number) {
        this.deltas[room.name].attacking += delta;
    }
    pipelineMetrics(room: string) {
        let destinationContainers = global.analysts.logistics.getContainers(Game.rooms[room]).filter(c => !global.analysts.sales.isMineContainer(c))
        let storage = global.analysts.logistics.getStorage(Game.rooms[room]);
        return {
            sourcesLevel: global.analysts.sales.getSources(Game.rooms[room]).reduce((sum, source) => (sum + source.energy), 0),
            sourcesMax: global.analysts.sales.getSources(Game.rooms[room]).reduce((sum, source) => (sum + source.energyCapacity), 0),
            mineContainersLevel: global.analysts.sales.getFranchiseLocations(Game.rooms[room])
            .reduce((sum, mine) => (sum + (mine.container?.store.energy || 0)), 0),
            mineContainersMax: global.analysts.sales.getFranchiseLocations(Game.rooms[room])
            .reduce((sum, mine) => (sum + (mine.container?.store.getCapacity() || 0)), 0),
            destinationContainersLevel: [...storage, ...destinationContainers].reduce((sum, container) => (sum + (container.store.energy || 0)), 0),
            destinationContainersMax: [...storage, ...destinationContainers].reduce((sum, container) => (sum + (container.store.getCapacity() || 0)), 0),
            roomEnergyLevel: Game.rooms[room].energyAvailable,
            roomEnergyMax: Game.rooms[room].energyCapacityAvailable,
            buildDelta: this.deltas[room].building,
            repairDelta: this.deltas[room].repairing,
            healDelta: this.deltas[room].healing,
            attackDelta: this.deltas[room].attacking,
        }
    }
    taskManagementMetrics(room: string) {
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
            pipelineMetrics: {
                sourcesLevel: number,
                mineContainersLevel: number
            },
            controllerProgress: number;
            controllerProgressTotal: number;
            controllerLevel: number; }
        } = {};
        for (let roomName in Game.rooms) {
            let room = Game.rooms[roomName];
            if (room.controller?.my) {
                rooms[roomName] = {
                    taskManagement: this.taskManagementMetrics(roomName),
                    pipelineMetrics: this.pipelineMetrics(roomName),
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
