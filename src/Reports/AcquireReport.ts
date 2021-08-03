import { findAcquireTarget, officeShouldClaimAcquireTarget, officeShouldSupportAcquireTarget } from "Selectors/findAcquireTarget";

export default () => {
    const target = findAcquireTarget();
    if (!target) return;
    console.log('Acquire target:', target);
    Game.map.visual.rect(new RoomPosition(1, 1, target), 48, 48, {fill: '#00ff00', stroke: 'transparent', opacity: 0.5});
    for (let room in Memory.offices) {
        if (officeShouldClaimAcquireTarget(room)) {
            console.log(room, 'should claim', target);
            Game.map.visual.line(new RoomPosition(25, 25, target), new RoomPosition(25, 25, room), {color: '#00ff00', width: 1, lineStyle: 'solid', opacity: 0.5});
        } else if (officeShouldSupportAcquireTarget(room)) {
            console.log(room, 'should support', target);
            Game.map.visual.line(new RoomPosition(25, 25, target), new RoomPosition(25, 25, room), {color: '#00ff00', width: 1, lineStyle: 'dashed', opacity: 0.5});

        }
    }
}
