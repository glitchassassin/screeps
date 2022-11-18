import { getTerritoryIntent, TerritoryIntent } from 'Selectors/territoryIntent';
import { memoize } from 'utils/memoizeFunction';

export const getRoomPathDistance = memoize(
  (room1: string, room2: string) => [room1, room2].sort().join(''),
  (room1: string, room2: string) => {
    const newRoute = Game.map.findRoute(room1, room2, {
      routeCallback: room => (getTerritoryIntent(room) === TerritoryIntent.AVOID ? Infinity : 0)
    });
    if (newRoute === -2) return undefined;
    return newRoute.length;
  }
);
