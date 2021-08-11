export interface Rect {x1: number, x2: number, y1: number, y2: number}
export interface Tile {x: number, y: number}

export function create_graph(roomname: string, rect: Rect, bounds: Rect): void
export function delete_tiles_to_dead_ends(roomname: string, cut_tiles_array: Tile[]): void
export function GetCutTiles(roomname: string, rect: Rect[], bounds?: Rect, verbose?: boolean): Tile[]
export function test(roomname: string): string
