import { getTerritoriesByOffice } from 'Selectors/getTerritoriesByOffice';
import { sourceIds } from 'Selectors/roomCache';

export const remoteFranchises = (office: string) => {
  const territories = getTerritoriesByOffice(office);
  return territories.flatMap(room => sourceIds(room).map(source => ({ source, room })));
};
