import { rcl } from "./rcl"

export const officeIsDownleveled = (office: string) => {
  return rcl(office) < Math.max(...Object.keys(Memory.rooms[office].rclMilestones ?? {}).map(Number))
}
