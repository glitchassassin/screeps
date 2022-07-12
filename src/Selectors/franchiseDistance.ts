export const franchiseDistance = (office: string, source: Id<Source>) => {
  const distance = Memory.rooms[office]?.territory?.sources[source].roads.length;
  return (distance !== undefined) ? distance / 27 : undefined;
}
