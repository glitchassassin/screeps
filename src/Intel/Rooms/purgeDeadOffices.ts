import { rcl } from 'Selectors/rcl';

export const purgeDeadOffices = () => {
  for (let office in Memory.offices) {
    if (rcl(office) > 1 && !Game.rooms[office]?.find(FIND_MY_SPAWNS).length && Object.keys(Memory.offices).length > 1) {
      // Office was destroyed
      Game.rooms[office]?.controller?.unclaim();
    }
    if (!Game.rooms[office]?.controller?.my) {
      delete Memory.offices[office];
      delete Memory.stats.offices[office];
    }
  }
};
