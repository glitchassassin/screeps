import { assignedLogisticsCapacity } from 'Behaviors/Logistics';
import { HarvestLedger } from 'Ledger/HarvestLedger';
import { HarvestMission } from 'Missions/Implementations/Harvest';
import { MissionType } from 'Missions/Mission';
import { Dashboard, Rectangle, Table } from 'screeps-viz';
import { byId } from 'Selectors/byId';
import { franchiseActive } from 'Selectors/franchiseActive';
import { franchiseEnergyAvailable } from 'Selectors/franchiseEnergyAvailable';
import { franchisesByOffice } from 'Selectors/franchisesByOffice';
import { posById } from 'Selectors/posById';

export default () => {
  for (const office in Memory.offices) {
    const activeMissionsBySource = Memory.offices[office]?.activeMissions.reduce((obj, mission) => {
      if (mission.type !== MissionType.HARVEST) return obj;
      obj[mission.data.source] ??= [];
      obj[mission.data.source].push(mission as HarvestMission);
      return obj;
    }, {} as Record<string, HarvestMission[]>);

    const totals = {
      harvested: 0,
      hauling: 0,
      value: 0
    };

    const data = franchisesByOffice(office).map(franchise => {
      let sourcePos = posById(franchise.source);
      let assigned = activeMissionsBySource[franchise.source]?.length ?? 0;
      let estimatedCapacity =
        activeMissionsBySource[franchise.source]
          ?.map(mission => (mission.data.distance ?? 50) * 2 * Math.min(10, mission.data.harvestRate))
          .reduce((a, b) => a + b) ?? 0;
      let disabled = !franchiseActive(office, franchise.source);

      const { perTick, isValid } = HarvestLedger.get(office, franchise.source);

      const assignedLogistics = assignedLogisticsCapacity(office).withdrawAssignments.get(franchise.source) ?? 0;

      const harvested = franchiseEnergyAvailable(franchise.source);
      const hauling = assignedLogistics;
      totals.harvested += harvested;
      totals.hauling += hauling;
      totals.value += perTick;

      return [
        `${office}:${sourcePos}${disabled ? '' : ' ✓'}`,
        assigned.toFixed(0),
        estimatedCapacity.toFixed(0),
        byId(franchise.source)?.energy.toFixed(0) ?? '--',
        harvested.toFixed(0),
        hauling.toFixed(0),
        `${perTick.toFixed(2)}${isValid ? '' : '?'}`
      ];
    });
    data.push(['--', '--', '--', '--', '--', '--', '--']);
    data.push(['', '', '', '', totals.harvested.toFixed(0), totals.hauling.toFixed(0), totals.value.toFixed(0)]);

    Dashboard({
      widgets: [
        {
          pos: { x: 1, y: 1 },
          width: 47,
          height: 2 + Math.min(48, data.length * 1.5),
          widget: Rectangle({
            data: Table({
              config: {
                headers: ['Franchise', 'Assigned', 'Estimated Capacity', 'Energy', 'Harvested', 'Hauling', 'Value']
              },
              data
            })
          })
        }
      ],
      config: { room: office }
    });
  }
};
