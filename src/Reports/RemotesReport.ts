import { HarvestLedger } from 'Ledger/HarvestLedger';
import { HarvestMission } from 'Missions/Implementations/HarvestMission';
import { LogisticsMission } from 'Missions/Implementations/LogisticsMission';
import { MissionStatus } from 'Missions/Mission';
import { activeMissions, isMission, isStatus } from 'Missions/Selectors';
import { Dashboard, Rectangle, Table } from 'screeps-viz';
import { byId } from 'Selectors/byId';
import { franchiseEnergyAvailable } from 'Selectors/Franchises/franchiseEnergyAvailable';
import { franchisesByOffice } from 'Selectors/Franchises/franchisesByOffice';
import { posById } from 'Selectors/posById';
import { sum } from 'Selectors/reducers';
import { visualizeHarassmentZones } from 'Strategy/Territories/HarassmentZones';

export default () => {
  visualizeHarassmentZones();
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

    const data = franchisesByOffice(office).map(franchise => {
      let sourcePos = posById(franchise.source);
      const mission = activeMissionsBySource[franchise.source];
      let assigned = mission?.creeps.harvesters.resolved.length ?? 0;
      let estimatedCapacity = mission?.haulingCapacityNeeded() ?? 0;

      let disabled = !mission || mission?.disabled();

      Game.map.visual.text(
        franchiseEnergyAvailable(franchise.source).toFixed(0) + (disabled ? ' N' : ' Y'),
        sourcePos!,
        { fontSize: 5 }
      );

      const { perTick, isValid } = HarvestLedger.get(office, franchise.source);

      const { scores, lastActive } = Memory.offices[office].franchises[franchise.source] ?? {};
      const perTickAverage = scores ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

      const assignedLogistics = activeMissions(office)
        .filter(isMission(LogisticsMission))
        .map(m => m.withdrawLedger.get(franchise.source) ?? 0)
        .reduce(sum, 0);

      const harvested = franchiseEnergyAvailable(franchise.source);
      const hauling = assignedLogistics;
      totals.harvested += harvested;
      totals.hauling += hauling;
      totals.value += perTick;
      totals.capacity += estimatedCapacity;

      return [
        `${sourcePos}${disabled ? '' : ' ✓'}`,
        mission?.missionData.distance ?? Infinity,
        assigned.toFixed(0),
        lastActive ? (lastActive - Game.time).toFixed(0) : '--',
        estimatedCapacity.toFixed(0),
        byId(franchise.source)?.energy.toFixed(0) ?? '--',
        harvested.toFixed(0),
        hauling.toFixed(0),
        `${perTick.toFixed(2)}${isValid ? '' : '?'} (${perTickAverage.toFixed(2)}/${scores?.length ?? '?'})`
      ];
    });
    data.sort((a, b) => (a[1] as number) - (b[1] as number));
    data.push(['--', '--', '--', '--', '--', '--', '--', '--', '--']);
    data.push([
      '',
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
                  'Active',
                  'Capacity',
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
