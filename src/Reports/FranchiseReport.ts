import { assignedLogisticsCapacity } from 'Behaviors/Logistics';
import { HarvestLedger } from 'Ledger/HarvestLedger';
import { HarvestMission } from 'Missions/Implementations/Harvest';
import { MissionType } from 'Missions/Mission';
import { activeMissions } from 'Missions/Selectors';
import { Bar, Dashboard, Label } from 'screeps-viz';
import { byId } from 'Selectors/byId';
import { franchiseActive } from 'Selectors/Franchises/franchiseActive';
import { franchiseEnergyAvailable } from 'Selectors/Franchises/franchiseEnergyAvailable';
import { franchisesByOffice } from 'Selectors/Franchises/franchisesByOffice';
import { getFranchiseDistance } from 'Selectors/Franchises/getFranchiseDistance';
import { posById } from 'Selectors/posById';
import { sourceIds } from 'Selectors/roomCache';
import { roomPlans } from 'Selectors/roomPlans';

export default () => {
  for (const office in Memory.offices) {
    const activeMissionsBySource = activeMissions(office).reduce((obj, mission) => {
      if (mission.type !== MissionType.HARVEST) return obj;
      obj[mission.data.source] ??= [];
      obj[mission.data.source].push(mission as HarvestMission);
      return obj;
    }, {} as Record<string, HarvestMission[]>);
    for (const franchise of franchisesByOffice(office)) {
      let sourcePos = posById(franchise.source);
      let storagePos = roomPlans(office)?.headquarters?.storage.pos;
      let assigned = activeMissionsBySource[franchise.source]?.length ?? 0;
      let disabled = !franchiseActive(office, franchise.source);
      const { scores } = Memory.rooms[franchise.room].franchises[office][franchise.source];

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

      const assignedLogistics = assignedLogisticsCapacity(office).withdrawAssignments.get(source.id);
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
