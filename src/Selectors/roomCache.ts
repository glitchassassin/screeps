import { posById } from "./posById";

export const sourceIds = (roomName: string) => Memory.rooms[roomName]?.sourceIds?.filter(s => s) as Id<Source>[];
export const sourcePositions = (roomName: string) => sourceIds(roomName).map(id => posById(id)).filter(s => s) as RoomPosition[];

export const mineralId = (roomName: string) => Memory.rooms[roomName]?.mineralId as Id<Mineral>|undefined;
export const mineralPosition = (roomName: string) => posById(mineralId(roomName));

export const controllerId = (roomName: string) => Memory.rooms[roomName]?.controllerId as Id<StructureController>|undefined;
export const controllerPosition = (roomName: string) => posById(controllerId(roomName));
