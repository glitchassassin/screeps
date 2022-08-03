export function isReservedByEnemy(room: string) {
  return Memory.rooms[room].reserver && Memory.rooms[room].reserver !== 'LordGreywether';
}

export function isOwnedByEnemy(room: string) {
  return Memory.rooms[room].owner && Memory.rooms[room].owner !== 'LordGreywether';
}
