export const destroyUnplannedStructures = (room: string) => {
  if (!Game.rooms[room]?.controller?.my || !Memory.roomPlans?.[room]?.office) return;
  // Destroy all controller-limited structures
  Game.rooms[room].find(FIND_STRUCTURES).forEach(s => {
    if (s.structureType !== STRUCTURE_ROAD && s.structureType !== STRUCTURE_CONTROLLER) {
      s.destroy();
    }
  });
  Game.rooms[room].find(FIND_CONSTRUCTION_SITES).forEach(s => s.remove());
};
