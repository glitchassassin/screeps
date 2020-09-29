import { classToPlain, TransformationType } from "class-transformer";

export const transformGameObject = (ObjectType: Function) => (value: any, obj: any, type: any) => {
    switch(type) {
        case TransformationType.PLAIN_TO_CLASS:
            return Game.getObjectById(value as Id<typeof ObjectType>);
        case TransformationType.CLASS_TO_PLAIN:
            return value?.id;
        case TransformationType.CLASS_TO_CLASS:
            return value;
    }
}
export const transformRoomPosition = (value: any, obj: any, type: any) => {
    switch(type) {
        case TransformationType.PLAIN_TO_CLASS:
            return value ? new RoomPosition(value.x, value.y, value.roomName) : null;
        case TransformationType.CLASS_TO_PLAIN:
            return value ? {
                x: value.x,
                y: value.y,
                roomName: value.roomName
            } : null;
        case TransformationType.CLASS_TO_CLASS:
            return value;
    }
}
