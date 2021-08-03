import { Dashboard, Rectangle, Table } from "screeps-viz";

export default () => {
    for (let room in Memory.offices) {
        const rclMilestones = Memory.rooms[room].rclMilestones;
        if (!rclMilestones) continue;
        const milestones = [];
        for (let i = 1; i <= 8; i++) {
            milestones.push([
                i,
                (rclMilestones[i] - (rclMilestones[i - 1] ?? rclMilestones[1])) ?? '',
                (rclMilestones[i] - rclMilestones[1]) ?? '',
            ])
        }
        Dashboard({
            widgets: [
                {
                    pos: { x: 1, y: 1 },
                    width: 15,
                    height: 10,
                    widget: Rectangle({ data: Table({
                        config: { headers: ['Level', 'From Previous', 'From First'] },
                        data: milestones
                    }) })
                }
            ],
            config: { room }
        })
    }
}
