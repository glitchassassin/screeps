import { RES_COLORS } from 'gameConstants';
import { Bar, Dashboard, Grid, Rectangle, Table } from 'screeps-viz';
import { boostQuotas } from 'Selectors/boostQuotas';
import { getLabs } from 'Selectors/getLabs';
import { boostsAvailable } from 'Selectors/shouldHandleBoosts';
import { viz } from 'Selectors/viz';

function drawLab(lab: StructureLab, position: RoomPosition) {}

export default () => {
  for (let office in Memory.offices) {
    if (Memory.offices[office].lab.orders.length === 0) {
      Game.map.visual.text('offline', new RoomPosition(25, 25, office), { fontSize: 5 });
      continue;
    }
    // queue
    Game.map.visual.rect(new RoomPosition(0, 0, office), 50, 50, { fill: '#000000', opacity: 0.7 });
    Memory.offices[office].lab.orders.slice(0, 6).forEach((order, i) => {
      Game.map.visual.text(order.ingredient1, new RoomPosition(7, 7 * (i + 1), office), {
        fontSize: 7,
        color: RES_COLORS[order.ingredient1]
      });
      Game.map.visual.text(order.ingredient2, new RoomPosition(17, 7 * (i + 1), office), {
        fontSize: 7,
        color: RES_COLORS[order.ingredient2]
      });
      Game.map.visual.text('=>', new RoomPosition(25, 7 * (i + 1), office), { fontSize: 7 });
      Game.map.visual.text(order.output, new RoomPosition(37, 7 * (i + 1), office), {
        fontSize: 7,
        color: RES_COLORS[order.output]
      });
    });
    const { boosts, inputs, outputs } = getLabs(office);
    [...boosts, ...inputs, ...outputs].forEach(
      ({ structure }) =>
        structure?.mineralType && viz(office).resource(structure.mineralType, structure.pos.x, structure.pos.y)
    );

    // Labs

    // detail view
    Dashboard({
      config: { room: office },
      widgets: [
        {
          pos: { x: 1, y: 1 },
          width: 25,
          height: 10,
          widget: Rectangle({
            data: Table({
              config: {
                headers: ['Ingredient1', 'Ingredient2', 'Output', 'Amount']
              },
              data: Memory.offices[office].lab.orders.map(order => [
                order.ingredient1,
                order.ingredient2,
                order.output,
                order.amount
              ])
            })
          })
        },
        {
          pos: { x: 1, y: 12 },
          width: 25,
          height: 10,
          widget: Rectangle({
            data: Table({
              config: {
                headers: ['Creep', 'Boosts']
              },
              data: Memory.offices[office].lab.boosts.map(order => [
                order.name,
                order.boosts.map(b => `${b.type}x${b.count}`).join(', ')
              ])
            })
          })
        }
      ]
    });

    // quotas
    Dashboard({
      config: { room: office },
      widgets: [
        {
          pos: { x: 27, y: 1 },
          width: 21,
          height: 47,
          widget: Rectangle({
            data: Grid({
              config: {
                columns: 6,
                rows: 7
              },
              data: boostQuotas(office).map(({ boost, amount }) =>
                Bar({
                  data: { maxValue: amount, value: boostsAvailable(office, boost, true, true) },
                  config: { label: boost, style: { fill: RES_COLORS[boost], stroke: RES_COLORS[boost] } }
                })
              )
            })
          })
        }
      ]
    });
  }
};
