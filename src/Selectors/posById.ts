import { unpackPos } from "utils/packrat";

export const posById = <T>(id?: Id<T>) => {
    if (!id) return undefined;
    const pos = Memory.positions[id];
    if (!pos) return undefined;
    return unpackPos(pos);
}
