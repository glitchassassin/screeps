export const followFlag = (creep: Creep) => {
    if (Game.flags[creep.name]) {
        creep.moveTo(Game.flags[creep.name]);
        return true;
    }
    return false;
}
