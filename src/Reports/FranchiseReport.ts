import { HarvestLedger } from 'Ledger/HarvestLedger';
import { LogisticsMission } from 'Missions/Implementations/LogisticsMission';
import { activeMissions, isMission } from 'Missions/Selectors';
import { Bar, Dashboard, Label } from 'screeps-viz';
import { byId } from 'Selectors/byId';
import { franchiseActive } from 'Selectors/Franchises/franchiseActive';
import { franchiseEnergyAvailable } from 'Selectors/Franchises/franchiseEnergyAvailable';
import { franchisesByOffice } from 'Selectors/Franchises/franchisesByOffice';
import { getFranchiseDistance } from 'Selectors/Franchises/getFranchiseDistance';
import { posById } from 'Selectors/posById';
import { sum } from 'Selectors/reducers';
import { sourceIds } from 'Selectors/roomCache';
import { roomPlans } from 'Selectors/roomPlans';

export default () => {
  for (const office in Memory.offices) {
    for (const franchise of franchisesByOffice(office)) {
      if (!Memory.offices[office].franchises[franchise.source]) continue;
      let sourcePos = posById(franchise.source);
      let storagePos = roomPlans(office)?.headquarters?.storage.pos;
      let disabled = !franchiseActive(office, franchise.source);
      const { scores } = Memory.offices[office].franchises[franchise.source];

      const { perTick, isValid } = HarvestLedger.get(office, franchise.source);

      if (sourcePos && storagePos) {
        Game.map.visual.line(sourcePos, storagePos, {
          color: disabled ? '#cccccc' : '#ffff00',
          lineStyle: disabled ? 'dashed' : 'solid'
        });

        const order = sourceIds(franchise.room).indexOf(franchise.source);

        const startY = Math.min(39 - 10 * order, sourcePos.y);

        Game.map.visual.text(
          (getFranchiseDistance(office, franchise.source)?.toFixed(0) ?? '--') +
            '🦶 ' +
            (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2) +
            '⚡',
          new RoomPosition(Math.max(0, sourcePos.x), startY + 4, sourcePos.roomName),
          { fontSize: 4 }
        );
        if (!disabled) {
          // `${assigned}⛏ ${byId(franchise.source)?.energy.toFixed(0) ?? '--'}⚡ ${franchiseEnergyAvailable(
          //   franchise.source
          // ).toFixed(0)}📦 ${perTick.toFixed(2)}${isValid ? '' : '?'}`;
          Game.map.visual.text(
            `${franchiseEnergyAvailable(franchise.source).toFixed(0)}📦 ${perTick.toFixed(2)}${isValid ? '' : '?'}⚡`,
            new RoomPosition(Math.max(0, sourcePos.x), startY + 10, sourcePos.roomName),
            { fontSize: 4 }
          );
        }
      }

      let source = byId(franchise.source);
      if (!source) continue;

      const assignedLogistics = activeMissions(office)
        .filter(isMission(LogisticsMission))
        .map(m => m.assignedLogisticsCapacity().withdrawAssignments.get(source!.id) ?? 0)
        .reduce(sum, 0);
      // console.log(source.pos, assignedLogistics);

      Dashboard({
        widgets: [
          {
            pos: {
              x: source.pos.x - 5,
              y: source.pos.y - 2.5
            },
            width: 2,
            height: 5,
            widget: Bar({
              data: {
                value: source.ticksToRegeneration ?? 0,
                maxValue: ENERGY_REGEN_TIME
              },
              config: {
                style: {
                  stroke: 'white',
                  fill: 'white'
                }
              }
            })
          },
          {
            pos: {
              x: source.pos.x - 2.5,
              y: source.pos.y - 2.5
            },
            width: 2,
            height: 5,
            widget: Bar({
              data: {
                value: source.energy,
                maxValue: source.energyCapacity
              },
              config: {
                style: {
                  stroke: 'green',
                  fill: 'green'
                }
              }
            })
          },
          {
            pos: {
              x: source.pos.x + 0.5,
              y: source.pos.y - 2.5
            },
            width: 2,
            height: 5,
            widget: Bar({
              data: {
                value: franchiseEnergyAvailable(source.id),
                maxValue: CONTAINER_CAPACITY
              },
              config: {
                style: {
                  stroke: 'yellow',
                  fill: 'yellow'
                }
              }
            })
          },
          {
            pos: {
              x: source.pos.x + 3,
              y: source.pos.y - 2.5
            },
            width: 2,
            height: 5,
            widget: Bar({
              data: {
                value: assignedLogistics ?? 0,
                maxValue: CONTAINER_CAPACITY
              },
              config: {
                style: {
                  stroke: 'blue',
                  fill: 'blue'
                }
              }
            })
          },
          {
            pos: {
              x: source.pos.x - 5.5,
              y: source.pos.y + 2
            },
            width: 7,
            height: 1,
            widget: Label({
              data: `Value: ${isValid ? '' : '(calculating)'} ${perTick.toFixed(2)}`,
              config: {
                style: {
                  color: 'white'
                }
              }
            })
          }
        ],
        config: { room: source.pos.roomName }
      });
    }
  }
};
