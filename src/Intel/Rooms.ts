import { cityNames } from "utils/CityNames";
import { packPos } from "utils/packrat";

declare global {
    interface RoomMemory {
        controllerId?: Id<StructureController>,
        sourceIds?: Id<Source>[],
        mineralId?: Id<Mineral>
        rcl?: number,
        owner?: string,
        reserver?: string,
        rclMilestones?: Record<number, number>,
    }
    interface Memory {
        positions: Record<string, string>
    }
}

export const scanRooms = () => {
    Memory.positions ??= {};
    Memory.rooms ??= {};

    // Purge dead offices
    for (let office in Memory.offices) {
        if (!Game.rooms[office]) {
            delete Memory.offices[office];
        }
    }

    for (let room in Game.rooms) {
        // Only need to store this once
        if (!Memory.rooms[room]) {
            const controllerId = Game.rooms[room].controller?.id;
            if (Game.rooms[room].controller) {
                Memory.positions[Game.rooms[room].controller!.id] = packPos(Game.rooms[room].controller!.pos)
            }
            const sourceIds = Game.rooms[room].find(FIND_SOURCES).map(s => {
                Memory.positions[s.id] = packPos(s.pos);
                return s.id
            });
            const mineralId = Game.rooms[room].find(FIND_MINERALS).map(m => {
                Memory.positions[m.id] = packPos(m.pos);
                return m.id;
            })[0];

            Memory.rooms[room] = {
                controllerId,
                sourceIds,
                mineralId,
            }
        }

        // Refresh this when visible
        Memory.rooms[room].rcl = Game.rooms[room].controller?.level
        Memory.rooms[room].owner = Game.rooms[room].controller?.owner?.username
        Memory.rooms[room].reserver = Game.rooms[room].controller?.reservation?.username

        // Assign office, if necessary
        Memory.offices ??= {}
        if (Game.rooms[room].controller?.my) {
            Memory.rooms[room].rclMilestones ??= {};
            Memory.rooms[room].rclMilestones![Game.rooms[room].controller!.level] ??= Game.time;

            if (!Memory.offices[room]) {
                Memory.offices[room] = {
                    city: cityNames.find(name => !Object.values(Memory.offices).some(r => r.city === name)) ?? room
                }
            }
        }
    }
}
