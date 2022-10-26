import { HarvestLedger } from 'Ledger/HarvestLedger';
import { HarvestMission } from 'Missions/Implementations/HarvestMission';
import { LogisticsMission } from 'Missions/Implementations/LogisticsMission';
import { MissionStatus } from 'Missions/Mission';
import { activeMissions, isMission, isStatus } from 'Missions/Selectors';
import { Dashboard, Rectangle, Table } from 'screeps-viz';
import { byId } from 'Selectors/byId';
import { franchiseActive } from 'Selectors/Franchises/franchiseActive';
import { franchiseEnergyAvailable } from 'Selectors/Franchises/franchiseEnergyAvailable';
import { franchisesByOffice } from 'Selectors/Franchises/franchisesByOffice';
import { posById } from 'Selectors/posById';
import { sum } from 'Selectors/reducers';

export default () => {
  for (const office in Memory.offices) {
    let actualLogisticsCapacity = 0;
    const activeMissionsBySource = activeMissions(office).reduce((obj, mission) => {
      if (isMission(LogisticsMission)(mission) && isStatus(MissionStatus.RUNNING)(mission))
        actualLogisticsCapacity += mission.capacity();
      if (!(mission instanceof HarvestMission)) return obj;
      obj[mission.missionData.source] = mission;
      return obj;
    }, {} as Record<string, HarvestMission>);

    const totals = {
      harvested: 0,
      hauling: 0,
      value: 0,
      capacity: 0
    };

    const data = franchisesByOffice(office, true).map(franchise => {
      let sourcePos = posById(franchise.source);
      Game.map.visual.text(franchiseEnergyAvailable(franchise.source).toFixed(0), sourcePos!, { fontSize: 5 });
      let assigned = activeMissionsBySource[franchise.source]?.creeps.harvesters.resolved.length ?? 0;
      let harvestRate = activeMissionsBySource[franchise.source]?.harvestRate() ?? 0;
      let estimatedCapacity = harvestRate * franchise.distance * 2;

      let disabled = !franchiseActive(office, franchise.source);

      const { perTick, isValid } = HarvestLedger.get(office, franchise.source);

      const { scores } = Memory.rooms[franchise.room].franchises[office][franchise.source] ?? {};
      const perTickAverage = scores ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

      const assignedLogistics = activeMissions(office)
        .filter(isMission(LogisticsMission))
        .map(m => m.assignedLogisticsCapacity().withdrawAssignments.get(franchise.source) ?? 0)
        .reduce(sum, 0);

      const harvested = franchiseEnergyAvailable(franchise.source);
      const hauling = assignedLogistics;
      totals.harvested += harvested;
      totals.hauling += hauling;
      totals.value += perTick;
      totals.capacity += estimatedCapacity;

      return [
        `${sourcePos}${disabled ? '' : ' ✓'}`,
        franchise.distance,
        assigned.toFixed(0),
        estimatedCapacity.toFixed(0),
        byId(franchise.source)?.energy.toFixed(0) ?? '--',
        harvested.toFixed(0),
        hauling.toFixed(0),
        `${perTick.toFixed(2)}${isValid ? '' : '?'} (${perTickAverage.toFixed(2)}/${scores?.length ?? '?'})`
      ];
    });
    data.push(['--', '--', '--', '--', '--', '--', '--', '--']);
    data.push([
      '',
      '',
      '',
      `${totals.capacity.toFixed(0)}/${actualLogisticsCapacity.toFixed(0)}`,
      '',
      totals.harvested.toFixed(0),
      totals.hauling.toFixed(0),
      totals.value.toFixed(0)
    ]);

    Dashboard({
      widgets: [
        {
          pos: { x: 1, y: 1 },
          width: 47,
          height: 2 + Math.min(48, data.length * 1.5),
          widget: Rectangle({
            data: Table({
              config: {
                headers: [
                  'Franchise',
                  'Distance',
                  'Assigned',
                  'Estimated Capacity',
                  'Energy',
                  'Harvested',
                  'Hauling',
                  'Value'
                ]
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