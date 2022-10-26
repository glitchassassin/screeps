import { Dashboard, Rectangle, Table } from 'screeps-viz';
import { creepStats } from 'Selectors/creepStats';
import { buyMarketPrice } from 'Selectors/Market/marketPrice';
import { viz } from 'Selectors/viz';
import { unpackPos } from 'utils/packrat';

export default () => {
  const minPowerPrice = buyMarketPrice(RESOURCE_POWER);
  const minEnergyPrice = buyMarketPrice(RESOURCE_ENERGY);
  const powerEnergyPrice = minPowerPrice / minEnergyPrice;
  for (const office in Memory.offices) {
    const data = Memory.offices[office].powerbanks
      .filter(r => r.distance && r.distance < 500)
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
          report.duoSpeed ?? '--',
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
                headers: ['Power Bank', 'Amount', 'Expires', 'Hits', 'Distance', 'Duo Speed', 'Power (energy)']
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
