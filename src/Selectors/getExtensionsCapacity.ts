import { rcl } from './rcl';
import { getExtensions } from './spawnsAndExtensionsDemand';

export const getExtensionsCapacity = (office: string) => {
  return (
    getExtensions(office).reduce(
      (sum, e) => sum + ((e.structure as StructureExtension)?.store.getCapacity(RESOURCE_ENERGY) ?? 0),
      0
    ) ?? 0
  );
};
export const approximateExtensionsCapacity = (office: string) => {
  // Instead of calculating the real capacity, estimate
  return CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION][rcl(office)] * EXTENSION_ENERGY_CAPACITY[rcl(office)];
};

export const roomHasExtensions = (office: string) => {
  // If capacity is from more than spawns
  return getExtensions(office).some(e => e.structure);
};
