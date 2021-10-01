import { MinionTypes } from "Minions/minionTypes";
import { Objectives } from "Objectives/Objective";
import { acquireTargetIsValid, findAcquireTarget, officeShouldClaimAcquireTarget, officeShouldSupportAcquireTarget } from "Selectors/findAcquireTarget";

export default () => {
    const target = findAcquireTarget();
    for (let room in Memory.rooms) {
        if (Memory.rooms[room].eligibleForOffice) {
            Game.map.visual.text('Eligible', new RoomPosition(25, 5, room), { fontSize: 3 })
        }
        if (Memory.rooms[room].owner) {
            Game.map.visual.text(Memory.rooms[room].owner!, new RoomPosition(25, 8, room), { fontSize: 3 })
        }
        if (Memory.rooms[room].reserver) {
            Game.map.visual.text(Memory.rooms[room].reserver!, new RoomPosition(25, 11, room), { fontSize: 3 })
        }
        if (Memory.roomPlans[room]?.office) {
            Game.map.visual.text('Planned', new RoomPosition(25, 14, room), { fontSize: 3 })
        }
        Game.map.visual.text('Min distance: ' +
            Math.min(...Object.keys(Memory.offices)
                            .filter(office => office !== room)
                            .map(office => Game.map.getRoomLinearDistance(office, room))
            ),
            new RoomPosition(25, 17, room),
            { fontSize: 3 }
        )
        if (acquireTargetIsValid(room)) {
            Game.map.visual.text('Valid Target', new RoomPosition(25, 20, room), { fontSize: 3 })
        }
    }
    if (!target) return;
    console.log('Acquire target:', target);
    Game.map.visual.rect(new RoomPosition(1, 1, target), 48, 48, {fill: '#00ff00', stroke: 'transparent', opacity: 0.5});
    for (let room in Memory.offices) {
        if (officeShouldClaimAcquireTarget(room)) {
            console.log(room, 'should claim', target);
            Game.map.visual.line(new RoomPosition(25, 25, target), new RoomPosition(25, 25, room), {color: '#00ff00', width: 1, lineStyle: 'solid', opacity: 0.5});
            Objectives['AcquireObjective'].minions(room + MinionTypes.LAWYER).forEach(creep => {
                Game.map.visual.line(new RoomPosition(25, 25, target), creep.pos, {color: '#00ffff', width: 1, lineStyle: 'solid', opacity: 0.5});
            })
        } else if (officeShouldSupportAcquireTarget(room)) {
            console.log(room, 'should support', target);
            Game.map.visual.line(new RoomPosition(25, 25, target), new RoomPosition(25, 25, room), {color: '#00ff00', width: 1, lineStyle: 'dashed', opacity: 0.5});
        }
    }
}
