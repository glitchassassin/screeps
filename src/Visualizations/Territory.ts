import { Office } from "Office/Office";
import { TerritoryIntelligence } from "Office/RoomIntelligence";
import { RES_COLORS } from "utils/resourceColors";

export const Territory = (topLeft: RoomPosition, t: TerritoryIntelligence) => {
    let vis = new RoomVisual(topLeft.roomName);

    // Draw background
    let intention = 'rgba(0,0,0,1)';
    if (t.intent === 'ACQUIRE') {
        intention = 'rgba(32,32,64,1)';
    } else if (t.intent === 'AVOID') {
        intention = 'rgba(64,0,0,1)';
    } else if (t.intent === 'EXPLOIT') {
        intention = 'rgba(0,64,0,1)';
    } else if (t.intent === 'DEFEND') {
        intention = 'rgba(64,64,0,1)';
    }
    vis.rect(topLeft.x, topLeft.y, 9, 9, {fill: intention})
    vis.text(t.name, topLeft.x + 4.5, topLeft.y + 4.5, {font: 2, backgroundColor: 'transparent', opacity: 0.7})

    // Draw hostile minions icon
    if (t.hostileMinions > 0) {
        Icon('▲', offset(topLeft, 1, 8), 'red', t.hostileMinions.toFixed(0))
    }
    // Draw hostile structures icon
    if (t.hostileStructures > 0) {
        Icon('♜', offset(topLeft, 3, 8), 'red', t.hostileStructures.toFixed(0))
    }
    // Draw sources
    if (t.sources.size > 0) {
        Icon('▢', offset(topLeft, 6, 8), '#ff0', t.sources.size.toFixed(0), '#ff0')
    }
    // Draw minerals
    if (t.mineral) {
        Icon('⭘', offset(topLeft, 8, 8), RES_COLORS[t.mineral], t.mineral, RES_COLORS[t.mineral])
    }

    // Draw visibility
    if (Game.rooms[t.name]) {
        Icon('👁', offset(topLeft, 7, 6), '#0f0')
    }

    // Draw hostile activity
    let hostile = Game.time - (t.lastHostileActivity ?? -100)
    if ((t.hostileMinions > 0 || t.hostileStructures > 0) && hostile < 100) {
        Icon('⚔', offset(topLeft, 2, 6), 'red', hostile.toFixed(0))
    }

    // Draw controller status
    vis.line(offset(topLeft, 1, 1), offset(topLeft, 1, 3), {color: 'red', lineStyle: 'solid'})
    vis.line(offset(topLeft, 3, 1), offset(topLeft, 3, 3), {color: 'red', lineStyle: 'dotted'})
    vis.line(offset(topLeft, 1, 2), offset(topLeft, 8, 2), {color: '#fff', lineStyle: 'dashed'})
    vis.line(offset(topLeft, 6, 1), offset(topLeft, 6, 3), {color: '#0f0', lineStyle: 'dotted'})
    vis.line(offset(topLeft, 8, 1), offset(topLeft, 8, 3), {color: '#0f0', lineStyle: 'solid'})

    if (t.controller.my) {
        Icon('⚙', offset(topLeft, 8, 2), '#0f0', t.controller.level?.toFixed(0))
    } else if (t.controller.myReserved) {
        Icon('⚙', offset(topLeft, 6, 2), '#0f0')
    } else if (t.controller.owner) {
        Icon('⚙', offset(topLeft, 1, 2), 'red', t.controller.level?.toFixed(0))
    } else if (t.controller.reserver) {
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
    console.log(topLeft);

    // Draw background
    vis.rect(topLeft.x, topLeft.y, 31, 31, {fill: 'rgba(0,0,0,1)'})

    let territories: (TerritoryIntelligence|null)[][] = [
        [null, null, null],
        [null, null, null],
        [null, null, null],
    ];
    territories[1][1] = o.center;
    let [xOffset, yOffset] = getRoomCoords(o.center.name);
    o.territories.forEach(t => {
        let [x, y] = getRoomCoords(t.name);
        x -= xOffset;
        y -= yOffset;
        territories[x+1][y+1] = t;
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
