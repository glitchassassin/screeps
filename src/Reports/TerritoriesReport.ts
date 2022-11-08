import { TERRITORY_RADIUS } from 'config';
import { Dashboard, Rectangle, Table } from 'screeps-viz';
import { ThreatLevel } from 'Selectors/Combat/threatAnalysis';
import { getTerritoriesByOffice } from 'Selectors/getTerritoriesByOffice';
import { calculateNearbyRooms, isSourceKeeperRoom } from 'Selectors/Map/MapCoordinates';

const colors = {
  [ThreatLevel.FRIENDLY]: '#00ff00',
  [ThreatLevel.OWNED]: '#ff0000',
  [ThreatLevel.REMOTE]: '#0000ff',
  [ThreatLevel.UNOWNED]: '#ffff00',
  [ThreatLevel.NONE]: '#333333',
  [ThreatLevel.UNKNOWN]: '#333333',
  [ThreatLevel.MIDNIGHT]: '#000000'
};

export default () => {
  for (let room in Memory.rooms) {
    const [threatLevel, hostileScore] = Memory.rooms[room].threatLevel ?? [ThreatLevel.UNKNOWN, 0];
    Game.map.visual.rect(new RoomPosition(5, 5, room), 43, 43, {
      fill: 'transparent',
      stroke: colors[threatLevel],
      strokeWidth: 5,
      opacity: 0.5
    });
    Game.map.visual.text(threatLevel, new RoomPosition(25, 45, room), { fontSize: 5 });
    Game.map.visual.text(hostileScore.toFixed(0), new RoomPosition(25, 25, room), { fontSize: 10 });
  }
  for (let office in Memory.offices) {
    const territories = getTerritoriesByOffice(office);
    const allTerritories = calculateNearbyRooms(office, TERRITORY_RADIUS, false).filter(
      t => !isSourceKeeperRoom(t) && Memory.rooms[t]?.office === office && !Memory.offices[t]
    );
    territories.forEach(territory => {
      Game.map.visual.line(new RoomPosition(25, 25, office), new RoomPosition(25, 25, territory), {
        color: '#ffffff',
        width: 3
      });
    });

    // Patrol route
    // getPatrolRoute(office).forEach((room, index) => {
    //     Game.map.visual.text(index.toFixed(0), new RoomPosition(25, 25, room), { fontSize: 3 })
    // })

    Dashboard({
      config: { room: office },
      widgets: [
        {
          pos: { x: 1, y: 1 },
          width: 47,
          height: 47,
          widget: Rectangle({
            data: Table({
              data: allTerritories.map(t => {
                const data = Memory.rooms[t].franchises[Memory.rooms[t].office ?? ''];
                const reserved = Memory.rooms[t].reserver === 'LordGreywether';
                if (!data) return [t, '--'];
                return [t + (territories.includes(t) ? ' ✓' : ''), Object.keys(data).length];
              }),
              config: {
                headers: ['Territory', 'Sources']
              }
            })
          })
        }
      ]
    });
  }
};
