import { allMissions } from 'Missions/BaseClasses/MissionImplementation';
import { PowerBankMission } from 'Missions/Implementations/PowerBankMission';
import { Dashboard, Rectangle, Table } from 'screeps-viz';
import { creepStats } from 'Selectors/creepStats';
import { buyMarketPrice } from 'Selectors/Market/marketPrice';
import { sum } from 'Selectors/reducers';
import { viz } from 'Selectors/viz';
import { unpackPos } from 'utils/packrat';

export default () => {
  const minPowerPrice = buyMarketPrice(RESOURCE_POWER);
  const minEnergyPrice = buyMarketPrice(RESOURCE_ENERGY);
  const powerEnergyPrice = minPowerPrice / minEnergyPrice;
  for (const office in Memory.offices) {
    const data = Memory.offices[office].powerbanks
      .filter(r => r.distance && r.distance < 550)
      .map(report => {
        const bankPos = unpackPos(report.pos);
        Game.map.visual.rect(new RoomPosition(0, 0, bankPos.roomName), 50, 50, {
          stroke: '#ff0000',
          strokeWidth: 4,
          fill: 'transparent'
        });
        Game.map.visual.text(report.amount.toFixed(0) + '✹', new RoomPosition(5, 10, bankPos.roomName), {
          fontSize: 10,
          align: 'left'
        });
        Game.map.visual.text(
          (report.expires - Game.time).toFixed(0) + '⏰',
          new RoomPosition(5, 20, bankPos.roomName),
          { fontSize: 10, align: 'left' }
        );
        Game.map.visual.text(
          ((report.hits / POWER_BANK_HITS) * 100).toFixed(2) + '%',
          new RoomPosition(5, 30, bankPos.roomName),
          { fontSize: 10, align: 'left' }
        );

        // time to crack
        if (Game.rooms[bankPos.roomName]) {
          const totalAttack = creepStats(bankPos.findInRange(FIND_CREEPS, 1)).attack;
          const timeToCrack = report.hits / totalAttack;
          viz(bankPos.roomName).text(
            `${Math.ceil(timeToCrack).toFixed(0)} ✹`,
            new RoomPosition(bankPos.x, bankPos.y - 1, bankPos.roomName)
          );
        }

        return [
          `${bankPos}`,
          report.amount,
          report.expires - Game.time,
          `${((100 * (report.hits ?? POWER_BANK_HITS)) / POWER_BANK_HITS).toFixed(2)}%`,
          report.distance ?? '--',
          `${report.duoCount ?? '--'}/${report.duoSpeed ?? '--'}`,
          (report.powerCost?.toFixed(2) ?? '--') + (report.powerCost && report.powerCost < powerEnergyPrice ? ' ✓' : '')
        ];
      });

    data.sort((a, b) => (a[4] === b[4] ? 0 : a[4] < b[4] ? -1 : 1));

    data.push(['--', '--', '--', '--', '--', '--', '--']);
    data.push([
      '--',
      'Energy (cr)',
      minEnergyPrice.toFixed(2),
      'Power (cr)',
      minPowerPrice.toFixed(2),
      'Power (energy)',
      (minPowerPrice / minEnergyPrice).toFixed()
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
                headers: ['Power Bank', 'Amount', 'Expires', 'Hits', 'Distance', 'Duo Count/Speed', 'Power (energy)']
              },
              data
            })
          })
        }
      ],
      config: { room: office }
    });

    // powerbank missions
    const missionData = [];
    for (const mission of allMissions()) {
      if (mission instanceof PowerBankMission) {
        const bankPos = unpackPos(mission.missionData.powerBankPos);
        Game.map.visual.line(new RoomPosition(25, 25, office), bankPos, { color: '#ff0000', width: 2 });
        const ticksToDecay = (mission.report()?.expires ?? Game.time) - Game.time;

        missionData.push([
          `${bankPos}`,
          mission.missions.duos.resolved.length,
          `${
            (mission.report()?.hits ?? 0) -
            mission.missions.duos.resolved.map(d => d.actualDamageRemaining()).reduce(sum, 0)
          }`,
          '' + ticksToDecay + ' ' + (mission.willBreachIn(ticksToDecay) ? 'Yes' : 'No'),
          mission.creeps.haulers.resolved.length
        ]);
      }
    }

    Dashboard({
      widgets: [
        {
          pos: { x: 1, y: 4 + Math.min(48, data.length * 1.5) },
          width: 47,
          height: 2 + Math.min(48, missionData.length * 1.5),
          widget: Rectangle({
            data: Table({
              config: {
                headers: ['Power Bank', 'Duos', 'Damage Remaining', 'Breaching?', 'Haulers']
              },
              data: missionData
            })
          })
        }
      ],
      config: { room: office }
    });
  }
};
