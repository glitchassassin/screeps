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
            return value ? Game.rooms[value.roomName].getPositionAt(value.x, value.y) : null;
        case TransformationType.CLASS_TO_PLAIN:
            return {
                x: value.x,
                y: value.y,
                roomName: value.roomName
            };
        case TransformationType.CLASS_TO_CLASS:
            return value;
    }
}
