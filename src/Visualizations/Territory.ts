import { lazyCount, lazyFilter } from "utils/lazyIterators";

import { CachedRoom } from "WorldState";
import { DefenseAnalyst } from "Boardroom/BoardroomManagers/DefenseAnalyst";
import { MapAnalyst } from "Boardroom/BoardroomManagers/MapAnalyst";
import { Office } from "Office/Office";
import { RES_COLORS } from "utils/resourceColors";

export const Territory = (topLeft: RoomPosition, t: CachedRoom) => {
    let vis = new RoomVisual(topLeft.roomName);
    let defenseAnalyst = global.boardroom.managers.get('DefenseAnalyst') as DefenseAnalyst;

    let intent = defenseAnalyst.getTerritoryIntent(t.name);
    let hostileMinions = lazyCount(global.worldState.hostileCreeps.byRoom.get(t.name) ?? []);
    let hostileStructures = lazyCount(lazyFilter(
        global.worldState.structures.byRoom.get(t.name) ?? [],
        structure => (
            (structure.structureType === STRUCTURE_SPAWN && !structure.my) ||
            (structure.structureType === STRUCTURE_KEEPER_LAIR)
        )
    ));
    let sources = lazyCount(global.worldState.sources.byRoom.get(t.name) ?? []);
    let [mineral] = global.worldState.minerals.byRoom.get(t.name) ?? [];
    let controller = global.worldState.controllers.byRoom.get(t.name);

    // Draw background
    let intention = 'rgba(0,0,0,1)';
    // if (intent === 'ACQUIRE') {
    //     intention = 'rgba(32,32,64,1)';
    // } else if (intent === 'AVOID') {
    //     intention = 'rgba(64,0,0,1)';
    // } else
    if (intent === 'EXPLOIT') {
        intention = 'rgba(0,64,0,1)';
    }
    // else if (intent === 'DEFEND') {
    //     intention = 'rgba(64,64,0,1)';
    // }
    vis.rect(topLeft.x, topLeft.y, 9, 9, {fill: intention})
    vis.text(t.name, topLeft.x + 4.5, topLeft.y + 4.5, {font: 2, backgroundColor: 'transparent', opacity: 0.7})

    // Draw hostile minions icon
    if (hostileMinions > 0) {
        Icon('▲', offset(topLeft, 1, 8), 'red', hostileMinions.toFixed(0))
    }
    // Draw hostile structures icon
    if (hostileStructures > 0) {
        Icon('♜', offset(topLeft, 3, 8), 'red', hostileStructures.toFixed(0))
    }
    // Draw sources
    if (sources > 0) {
        Icon('▢', offset(topLeft, 6, 8), '#ff0', sources.toFixed(0), '#ff0')
    }
    // Draw minerals
    if (mineral?.type) {
        Icon('⭘', offset(topLeft, 8, 8), RES_COLORS[mineral.type], mineral.type, RES_COLORS[mineral.type])
    }

    // Draw visibility
    if (t.gameObj) {
        Icon('👁', offset(topLeft, 7, 6), '#0f0')
    }

    // Draw hostile activity
    let hostile = Game.time - (t.lastHostileActivity ?? -100)
    if ((hostileMinions > 0 || hostileStructures > 0) && hostile < 100) {
        Icon('⚔', offset(topLeft, 2, 6), 'red', hostile.toFixed(0))
    }

    // Draw controller status
    vis.line(offset(topLeft, 1, 1), offset(topLeft, 1, 3), {color: 'red', lineStyle: 'solid'})
    vis.line(offset(topLeft, 3, 1), offset(topLeft, 3, 3), {color: 'red', lineStyle: 'dotted'})
    vis.line(offset(topLeft, 1, 2), offset(topLeft, 8, 2), {color: '#fff', lineStyle: 'dashed'})
    vis.line(offset(topLeft, 6, 1), offset(topLeft, 6, 3), {color: '#0f0', lineStyle: 'dotted'})
    vis.line(offset(topLeft, 8, 1), offset(topLeft, 8, 3), {color: '#0f0', lineStyle: 'solid'})

    if (controller?.my) {
        Icon('⚙', offset(topLeft, 8, 2), '#0f0', controller?.level?.toFixed(0))
    } else if (controller?.myReserved) {
        Icon('⚙', offset(topLeft, 6, 2), '#0f0')
    } else if (controller?.owner) {
        Icon('⚙', offset(topLeft, 1, 2), 'red', controller?.level?.toFixed(0))
    } else if (controller?.reservationOwner) {
        Icon('⚙', offset(topLeft, 3, 2), 'red')
    }
}

export const Icon = (icon: string, center: RoomPosition, color: string, label?: string, labelColor?: string) => {
    let vis = new RoomVisual(center.roomName);
    vis.text(icon, center, {color, backgroundColor: 'transparent', font: 2})
    if (label) vis.text(label, center, {color: labelColor, backgroundColor: 'transparent'});
}

export const Minimap = (topLeft: RoomPosition, o: Office) => {
    let vis = new RoomVisual(topLeft.roomName);
    let mapAnalyst = global.boardroom.managers.get('MapAnalyst') as MapAnalyst;

    // Draw background
    vis.rect(topLeft.x, topLeft.y, 31, 31, {fill: 'rgba(0,0,0,1)'})

    let territories: (CachedRoom|null)[][] = [
        [null, null, null],
        [null, null, null],
        [null, null, null],
    ];
    territories[1][1] = o.center;
    let coords = mapAnalyst.roomNameToCoords(o.center.name);
    let xOffset = coords.wx;
    let yOffset = coords.wy;

    mapAnalyst.calculateNearbyRooms(o.center.name, 1).forEach(t => {
        let {wx, wy} = mapAnalyst.roomNameToCoords(t);
        wx = xOffset - wx;
        wy = yOffset - wy;
        territories[wx+1][wy+1] = global.worldState.rooms.byRoom.get(t) ?? null;
    })
    territories.forEach((row, x) => {
        let top = topLeft.x + 1 + (10 * x);
        row.forEach((t, y) => {
            let left = topLeft.y + 1 + (10 * y);
            if (t === null) return;
            Territory(new RoomPosition(top, left, topLeft.roomName), t)
        })
    })
}

const getRoomCoords = (roomName: string) => {
    let match = roomName.match(/^([WE])([0-9]+)([NS])([0-9]+)$/);
    if (!match) throw new Error('Invalid room name')
    let [,h,wx,v,wy] = match
    let x = (h === 'W') ? ~Number(wx) : Number(wx);
    let y = (v === 'N') ? ~Number(wy) : Number(wy);
    return [x, y];
}

const offset = (pos: RoomPosition, x: number, y: number) => {
    return new RoomPosition(
        Math.max(0, Math.min(49, pos.x + x)),
        Math.max(0, Math.min(49, pos.y + y)),
        pos.roomName)
}
