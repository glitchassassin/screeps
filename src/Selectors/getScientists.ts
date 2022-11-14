const cache = new Map<string, string[]>();

export const registerScientists = (office: string, creeps: Creep[]) => {
  cache.set(
    office,
    creeps.map(c => c.name)
  );
};
export const getScientists = (office: string) => {
  const creeps = (cache.get(office) ?? []).map(name => Game.creeps[name]).filter(c => !!c);
  registerScientists(office, creeps);
  return creeps;
};
