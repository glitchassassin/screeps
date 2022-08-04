import { memoizeByTick } from 'utils/memoizeFunction';

export const viz = memoizeByTick(
  (room?: string) => room ?? '',
  (room?: string) => new RoomVisual(room)
);
