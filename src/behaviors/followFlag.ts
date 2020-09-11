export const followFlag = (creep: Creep, flag?: string) => {
    if (flag) {
        if (Game.flags[flag]) {
            creep.moveTo(Game.flags[flag]);
            return true;
        }
        return false;
    }
    if (Game.flags[creep.name]) {
        creep.moveTo(Game.flags[creep.name]);
        return true;
    }
    return false;
}
