import { BlockPlan } from './classes/BlockPlan';
import { BoardroomManager } from 'Boardroom/BoardroomManager';
import { CachedRoom } from 'WorldState';
import { FranchisePlan } from './FranchisePlan';
import { HeadquartersPlan } from './HeadquartersPlan';
import { fillExtensions } from './ExtensionsPlan';
import { lazyMap } from 'utils/lazyIterators';
import profiler from 'screeps-profiler';

export class RoomArchitect extends BoardroomManager {
    roomPlans = new Map<string, BlockPlan>();
    plan() {
        let start = Game.cpu.getUsed();
        if (Game.cpu.bucket < 500) return; // Don't do room planning at low bucket levels
        for (let [,room] of global.worldState.rooms.byRoom) {
            if (Game.cpu.getUsed() - start > 5) break; // Don't spend more than 5 CPU/tick doing room planning

            if (room.roomPlan !== '' && this.roomPlans.has(room.name)) continue;

            if (room.roomPlan) {
                if (room.roomPlan.startsWith('FAILED')) {
                    // If planning step failed, leave BlockPlan empty
                    this.roomPlans.set(room.name, new BlockPlan());
                } else {
                    this.roomPlans.set(room.name, this.reloadPlan(room.roomPlan));
                }
            } else {
                if (this.isEligible(room)) {
                    // Calculate from scratch
                    this.roomPlans.set(room.name, this.planRoom(room));
                } else {
                    room.roomPlan = 'FAILED - ineligible'
                    this.roomPlans.set(room.name, new BlockPlan());
                }

            }
        }
    }

    isEligible(room: CachedRoom) {
        // Room must have a controller and two sources
        // To avoid edge cases, controller and sources must not be within range 5 of each other
        let controller = global.worldState.controllers.byRoom.get(room.name);
        if (!controller) {
            console.log(`Room planning for ${room.name} - No controller`);
            return false;
        }
        let sources = global.worldState.sources.byRoom.get(room.name);
        if (!sources || sources.size < 2) {
            console.log(`Room planning for ${room.name} - Invalid number of sources`);
            return false;
        }

        let [source1, source2] = sources;
        if (controller.pos.getRangeTo(source1.pos) < 5) {
            console.log(`Room planning for ${room.name} - Source too close to controller`);
            return false;
        }
        if (controller.pos.getRangeTo(source2.pos) < 5) {
            console.log(`Room planning for ${room.name} - Source too close to controller`);
            return false;
        }
        if (source1.pos.getRangeTo(source2.pos) < 5) {
            console.log(`Room planning for ${room.name} - Sources too close together`);
            return false;
        }
        return true;
    }

    reloadPlan(roomPlan: string) {
        let plan = new BlockPlan();
        plan.deserialize(roomPlan);
        return plan;
    }

    planRoom(room: CachedRoom) {
        let start = Game.cpu.getUsed();

        let roomBlock = new BlockPlan();

        // Get sources
        let sources = global.worldState.sources.byRoom.get(room.name) ?? [];
        // Calculate FranchisePlans
        let franchise1, franchise2, headquarters;
        try {
            let plans = Array.from(lazyMap(sources, source => new FranchisePlan(source.pos)));
            if (plans.length !== 2) throw new Error(`Unexpected number of sources: ${plans.length}`)
            plans.sort((a, b) => a.rangeToController - b.rangeToController);
            [franchise1, franchise2] = plans;
        } catch (e) {
            room.roomPlan = 'FAILED generating franchises';
            console.log(room.roomPlan, e);
            return roomBlock;
        }
        try {
            headquarters = new HeadquartersPlan(room.name);
        } catch (e) {
            room.roomPlan = 'FAILED generating headquarters';
            console.log(room.roomPlan, e);
            return roomBlock;
        }

        // Sort structures by build order
        // RCL 1
        roomBlock.structures.push(franchise1.spawn);
        roomBlock.structures.push(franchise2.container);
        roomBlock.structures.push(franchise1.container);
        roomBlock.structures.push(headquarters.container);
        // RCL 2
        roomBlock.structures.push(...franchise2.extensions);
        roomBlock.structures.push(...franchise1.extensions);
        roomBlock.structures.push(...headquarters.roads);
        // RCL 3
        roomBlock.structures.push(headquarters.towers[0]);
        // RCL 4
        roomBlock.structures.push(headquarters.storage);
        // RCL 5
        roomBlock.structures.push(headquarters.towers[1]);
        roomBlock.structures.push(franchise2.link);
        roomBlock.structures.push(headquarters.link);
        // RCL 6
        roomBlock.structures.push(franchise1.link);
        roomBlock.structures.push(headquarters.terminal);
        // RCL 7
        roomBlock.structures.push(headquarters.spawn);
        roomBlock.structures.push(headquarters.towers[2]);
        // RCL 8
        roomBlock.structures.push(franchise2.spawn);
        roomBlock.structures.push(headquarters.towers[3]);
        roomBlock.structures.push(headquarters.towers[4]);
        roomBlock.structures.push(headquarters.towers[5]);

        // Fill in remaining extensions
        let count = CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION][8];
        fillExtensions(room.name, roomBlock, count);

        room.roomPlan = roomBlock.serialize();

        let end = Game.cpu.getUsed();
        console.log(`Planned room ${room.name} with ${end - start} CPU`);
        return roomBlock;
    }

    cleanup() {
        if (global.v.planning.state) {
            for (let [roomName, room] of global.worldState.rooms.byRoom) {
                if (room.roomPlan) {
                    if (room.roomPlan.startsWith('FAILED')) {
                        Game.map.visual.text('Failed', new RoomPosition(10, 5, roomName), {color: '#ff0000', fontSize: 5});
                    } else {
                        Game.map.visual.text('Planned', new RoomPosition(10, 5, roomName), {color: '#00ff00', fontSize: 5});
                    }
                }
            }
            this.roomPlans.forEach((v, roomName) => {
                v.visualize()
            });
        }
    }
}
profiler.registerClass(RoomArchitect, 'RoomArchitect');
