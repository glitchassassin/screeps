import { BlockPlan } from './classes/BlockPlan';
import { BoardroomManager } from 'Boardroom/BoardroomManager';
import { CachedRoom } from 'WorldState';
import { FranchisePlan } from './FranchisePlan';
import { lazyMap } from 'utils/lazyIterators';
import profiler from 'screeps-profiler';

export class RoomArchitect extends BoardroomManager {
    roomPlans = new Map<string, BlockPlan>();
    plan() {
        for (let [,room] of global.worldState.rooms.byRoom) {
            if (this.roomPlans.has(room.name)) continue;

            if (room.roomPlan) {
                let plan = new BlockPlan();
                this.roomPlans.set(room.name, plan);
                // If planning step failed, leave BlockPlan empty
                if (room.roomPlan.startsWith('FAILED')) continue;
                // Reconstitute from string
                plan.deserialize(room.roomPlan);
            } else {
                // Calculate from scratch
                this.planRoom(room);
            }
        }
    }

    planRoom(room: CachedRoom) {
        let start = Game.cpu.getUsed();
        // Get sources
        let sources = global.worldState.sources.byRoom.get(room.name) ?? [];
        // Calculate FranchisePlans
        let franchise1, franchise2;
        try {
            let plans = Array.from(lazyMap(sources, source => new FranchisePlan(source.pos)));
            if (plans.length !== 2) throw new Error(`Unexpected number of sources: ${plans.length}`)
            plans.sort((a, b) => a.rangeToController - b.rangeToController);
            [franchise1, franchise2] = plans;
        } catch {
            room.roomPlan = 'FAILED generating franchises';
            return;
        }

        // Sort structures by build order
        let roomBlock = new BlockPlan();
        this.roomPlans.set(room.name, roomBlock);
        // RCL 1
        roomBlock.structures.push(franchise1.spawn);
        roomBlock.structures.push(franchise2.container);
        roomBlock.structures.push(franchise1.container);
        // RCL 2
        roomBlock.structures.push(...franchise2.extensions);
        roomBlock.structures.push(...franchise1.extensions);
        // RCL 5
        roomBlock.structures.push(franchise2.link);
        // RCL 6
        roomBlock.structures.push(franchise1.link);
        // RCL 7
        roomBlock.structures.push(franchise2.spawn);

        room.roomPlan = roomBlock.serialize();

        let end = Game.cpu.getUsed();
        console.log(`Planned room ${room.name} with ${end - start} CPU`);
    }

    cleanup() {
        if (global.v.planning.state) {
            console.log('Visualizing room plan');
            this.roomPlans.forEach(v => v.visualize());
        }
    }
}
profiler.registerClass(RoomArchitect, 'RoomArchitect');
