import { SpawnOrder } from 'Minions/spawnQueues';
import { createAcquireEngineerOrder } from 'Missions/Implementations/AcquireEngineer';
import { createAcquireLawyerOrder } from 'Missions/Implementations/AcquireLawyer';
import { MissionType } from 'Missions/Mission';
import { activeMissions, isMission } from 'Missions/Selectors';
import {
  findAcquireTarget,
  officeShouldClaimAcquireTarget,
  officeShouldSupportAcquireTarget
} from 'Strategy/Acquire/findAcquireTarget';

export default {
  name: 'Acquire',
  byTick: () => {},
  byOffice: (office: string): SpawnOrder[] => {
    const target = findAcquireTarget();
    if (target && officeShouldClaimAcquireTarget(office)) {
      if (!activeMissions(office).some(isMission(MissionType.ACQUIRE_LAWYER))) {
        return [createAcquireLawyerOrder(office, target)];
      }
    } else if (target && officeShouldSupportAcquireTarget(office)) {
      if (!activeMissions(target).some(isMission(MissionType.ENGINEER))) {
        return [createAcquireEngineerOrder(office, target)];
      }
    }
    return [];
  }
};
