import { ScannedFranchiseEvent, ScannedRoomEvent } from 'Intel/events';
import { scanRoomPlanStructures } from 'RoomPlanner/scanRoomPlanStructures';
import { franchisesByOffice } from 'Selectors/Franchises/franchisesByOffice';
import { cleanPowerBankReports, scanPowerBanks } from 'Strategy/ResourceAnalysis/PowerBank';
import { cleanThreats, scanRoomForThreats } from 'Strategy/Territories/HarassmentZones';
import { updateFranchisePaths } from './Franchises/updateFranchisePaths';
import { updateLedger } from './Franchises/updateLedger';
import { initializeOfficeMemory } from './Rooms/initializeOfficeMemory';
import { initializeRoomMemory } from './Rooms/initializeRoomMemory';
import { mineralQuotas } from './Rooms/mineralQuotas';
import { purgeDeadOffices } from './Rooms/purgeDeadOffices';
import { refreshRoomMemory } from './Rooms/refreshRoomMemory';

export const runIntel = () => {
  purgeDeadOffices();
  cleanThreats();
  cleanPowerBankReports();

  const territories = Object.keys(Memory.offices).filter(office => Memory.offices[office].territories);
  for (const room in Game.rooms) {
    const scannedRoom: ScannedRoomEvent = {
      room,
      office: !!Game.rooms[room].controller?.my,
      territory: territories.includes(room)
    };

    initializeRoomMemory(scannedRoom);
    initializeOfficeMemory(scannedRoom);
    refreshRoomMemory(scannedRoom);
    mineralQuotas(scannedRoom);
    scanRoomForThreats(scannedRoom);
    scanRoomPlanStructures(scannedRoom);
    scanPowerBanks(scannedRoom);

    if (scannedRoom.office) {
      for (const { source, remote } of franchisesByOffice(room)) {
        const scannedFranchise: ScannedFranchiseEvent = {
          office: room,
          source,
          remote
        };

        updateFranchisePaths(scannedFranchise);
        updateLedger(scannedFranchise);
      }
    }
  }
};
