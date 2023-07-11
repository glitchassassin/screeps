import { ScannedFranchiseEvent, ScannedRoomEvent } from 'Intel/events';
import { scanRoomPlanStructures } from 'RoomPlanner/scanRoomPlanStructures';
import { franchisesByOffice } from 'Selectors/Franchises/franchisesByOffice';
import { cleanPowerBankReports, scanPowerBanks } from 'Strategy/ResourceAnalysis/PowerBank';
import { cleanThreats, scanRoomForThreats } from 'Strategy/Territories/HarassmentZones';
import { runTaskManager } from 'TaskManager';
import { updateFranchisePaths } from './Franchises/updateFranchisePaths';
import { updateLedger } from './Franchises/updateLedger';
import { initializeOfficeMemory } from './Rooms/initializeOfficeMemory';
import { initializeRoomMemory } from './Rooms/initializeRoomMemory';
import { mineralQuotas } from './Rooms/mineralQuotas';
import { purgeDeadOffices } from './Rooms/purgeDeadOffices';
import { refreshRoomMemory } from './Rooms/refreshRoomMemory';

export const runIntel = () => {
  const territories = Object.keys(Memory.offices).flatMap(office => Memory.offices[office].territories ?? []);

  runTaskManager([
    { name: 'purgeDeadOffices', fn: purgeDeadOffices },
    { name: 'cleanThreats', fn: cleanThreats },
    { name: 'cleanPowerBankReports', fn: cleanPowerBankReports },
    ...Object.keys(Memory.offices)
      .map(room => ({
        name: "Scan room plan",
        mandatory: true,
        fn() {
          const scannedRoom: ScannedRoomEvent = {
            room,
            office: !!Game.rooms[room].controller?.my,
            territory: territories.includes(room)
          };
          scanRoomPlanStructures(scannedRoom);
        },
        runEvery: 20
      })),
    ...Object.keys(Game.rooms)
      .sort((a, b) => (Memory.rooms[a]?.scanned ?? 0) - (Memory.rooms[b]?.scanned ?? 0))
      .map(room => ({
        name: "Scan room",
        mandatory: Game.rooms[room]?.controller?.my,
        fn() {
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
      })),
  ], Game.cpu.limit * 0.1);
};
