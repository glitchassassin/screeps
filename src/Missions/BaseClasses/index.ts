export const fixedCount = (target: () => number) => (creeps: Creep[]) => target() - creeps.length;
