import { Office } from "Office/Office";
import { TerritoryIntelligence } from "Office/RoomIntelligence";
import { RES_COLORS } from "utils/resourceColors";

export const Territory = (topLeft: RoomPosition, t: TerritoryIntelligence) => {
    let vis = new RoomVisual(topLeft.roomName);

    // Draw background
    let intention = 'rgba(0,0,0,1)';
    if (t.intent === 'ACQUIRE') {
        intention = 'rgba(128,128,255,0.3)';
    } else if (t.intent === 'AVOID') {
        intention = 'rgba(255,0,0,0.3)';
    } else if (t.intent === 'EXPLOIT') {
        intention = 'rgba(0,255,0,0.3)';
    } else if (t.intent === 'DEFEND') {
        intention = 'rgba(255,255,0,0.3)';
    }
    vis.rect(topLeft.x, topLeft.y, 10, 10, {fill: intention})
    vis.text(t.name, topLeft.x + 5, topLeft.y + 5, {font: 2, backgroundColor: 'transparent', opacity: 0.7})

    // Draw hostile minions icon
    if (t.hostileMinions > 0) {
        Icon('▲', offset(topLeft, 1, 9), 'red', t.hostileMinions.toFixed(0))
    }
    // Draw hostile structures icon
    if (t.hostileStructures > 0) {
        Icon('♜', offset(topLeft, 3, 9), 'red', t.hostileStructures.toFixed(0))
    }
    // Draw visibility
    if (Game.rooms[t.name]) {
        Icon('👁', offset(topLeft, 9, 9), '#0f0')
    }
    // Draw sources
    if (t.sources.size > 0) {
        Icon('▢', offset(topLeft, 7, 9), '#ff0', t.sources.size.toFixed(0), '#ff0')
    }
    // Draw minerals
    if (t.mineral) {
        Icon('⭘', offset(topLeft, 5, 9), RES_COLORS[t.mineral], t.mineral, RES_COLORS[t.mineral])
    }

    // Draw hostile activity
    let hostile = Game.time - (t.lastHostileActivity ?? -100)
    if ((t.hostileMinions > 0 || t.hostileStructures > 0) && hostile < 100) {
        Icon('⚔', offset(topLeft, 5, 7), 'red', hostile.toFixed(0))
    }

    // Draw controller status
    vis.line(offset(topLeft, 1, 1), offset(topLeft, 1, 3), {color: 'red', lineStyle: 'solid'})
    vis.line(offset(topLeft, 3, 1), offset(topLeft, 3, 3), {color: 'red', lineStyle: 'dotted'})
    vis.line(offset(topLeft, 1, 2), offset(topLeft, 9, 2), {color: '#fff', lineStyle: 'dashed'})
    vis.line(offset(topLeft, 7, 1), offset(topLeft, 7, 3), {color: '#0f0', lineStyle: 'dotted'})
    vis.line(offset(topLeft, 9, 1), offset(topLeft, 9, 3), {color: '#0f0', lineStyle: 'solid'})

    if (t.controller.my) {
        Icon('⚙', offset(topLeft, 9, 2), '#0f0', t.controller.level?.toFixed(0))
    } else if (t.controller.myReserved) {
        Icon('⚙', offset(topLeft, 7, 2), '#0f0')
    } else if (t.controller.owner) {
        Icon('⚙', offset(topLeft, 1, 2), 'red', t.controller.level?.toFixed(0))
    } else if (t.controller.reserver) {
        Icon('⚙', offset(topLeft, 3, 2), 'red')
    } else {
        Icon('⚙', offset(topLeft, 5, 2), '#fff')
    }
}

export const Icon = (icon: string, center: RoomPosition, color: string, label?: string, labelColor?: string) => {
    let vis = new RoomVisual(center.roomName);
    vis.text(icon, center, {color, backgroundColor: 'transparent', font: 2})
    if (label) vis.text(label, center, {color: labelColor, backgroundColor: 'transparent'});
}

export const Minimap = (topLeft: RoomPosition, o: Office) => {
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
        let top = topLeft.x + (11 * x);
        row.forEach((t, y) => {
            let left = topLeft.y + (11 * y);
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
    let y = (v === 'S') ? ~Number(wy) : Number(wy);
    return [x, y];
}

const offset = (pos: RoomPosition, x: number, y: number) => {
    return new RoomPosition(
        Math.max(0, Math.min(49, pos.x + x)),
        Math.max(0, Math.min(49, pos.y + y)),
        pos.roomName)
}
