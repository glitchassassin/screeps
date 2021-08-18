// example declaration file - remove these and add your own custom typings

// From https://github.com/screepers/RoomVisual
interface RoomVisual {
  structure(x: number, y: number, structureType: StructureConstant): RoomVisual
  speech(text: string, x: number, y: number): RoomVisual
  animatedPosition(x: number, y: number): RoomVisual
  resource(type: ResourceConstant, x: number, y: number): RoomVisual
  connectRoads(): RoomVisual
}

interface RawMemory {
  _parsed: Memory
}

interface RoomTerrain {
  getRawBuffer(): Uint8Array
}

interface OfficeMemory {
  city: string,
  resourceQuotas: Partial<Record<ResourceConstant, number>>,
}

interface Memory {
  offices: {
    [name: string]: OfficeMemory
  }
}

declare namespace GreyCompany {
  interface Heap { }
}
// `global` extension samples
declare namespace NodeJS {
  interface Global {
    log: any;
    purge: Function;
  }
}
