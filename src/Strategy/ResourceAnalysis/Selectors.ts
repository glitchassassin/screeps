export const powerBankReport = (office: string, id: Id<StructurePowerBank>) =>
  Memory.offices[office].powerbanks.find(r => r.id === id);
