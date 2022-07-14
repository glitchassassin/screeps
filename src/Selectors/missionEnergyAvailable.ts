import { energyInTransit, roomEnergyAvailable } from "./storageEnergyAvailable";

export const missionEnergyAvailable = (office: string) => {
  return (
    roomEnergyAvailable(office) +
    energyInTransit(office)
  );
}
