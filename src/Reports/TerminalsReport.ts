import { officeResourceSurplus } from "Selectors/officeResourceSurplus";

export default () => {
    for (let office in Memory.offices) {
        const surpluses = officeResourceSurplus(office);
        let rows = 0;
        for (let [resource, amount] of surpluses) {
            const length = (25 * (amount / 5000))
            let color = (amount >= 0) ? '#00ff00' : '#ff0000';

            Game.map.visual.rect(
                new RoomPosition(25, rows * 5, office),
                Math.min(25, length),
                5,
                { stroke: color, fill: color }
            )
            Game.map.visual.text(resource, new RoomPosition(25, rows * 5 + 2, office), { fontSize: 4 });
            rows += 1;
            if (rows >= 10) break;
        }
    }
}
