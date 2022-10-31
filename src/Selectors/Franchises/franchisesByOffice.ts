import { sourceIds } from '../roomCache';
import { remoteFranchises } from './remoteFranchises';

export const franchisesByOffice = (officeName: string) => {
  return sourceIds(officeName)
    .map(source => ({
      source,
      room: officeName,
      remote: false
    }))
    .concat(remoteFranchises(officeName).map(f => ({ ...f, remote: true })));
};
