/* eslint-disable */

declare global {
  interface Game {
    profiler: {
      stream: (duration: number, filter?: string) => void
      email: (duration: number, filter?: string) => void
      profile: (duration: number, filter?: string) => void
      background: (filter?: string) => void
      restart: () => void
      reset: () => void
      output: (passedOutputLengthLimit?: number) => void
    }
  }
}

interface Mem {
  filter?: string
  enabledTick: number
  disableTick: number
  type: string
  totalTime: number
  totalIntents: number
  map: { [key: string]: { calls: number; time: number; intents: number } }
}

let Mem: Mem = {
  enabledTick: -1,
  disableTick: -1,
  type: "",
  totalTime: -1,
  totalIntents: -1,
  map: {},
}

const intentCost = 0.2

let enabled = false
let depth = 0
let intents = 0

function AlreadyWrappedError(this: { name: string; message: string; stack?: string }) {
  this.name = "AlreadyWrappedError"
  this.message = "Error attempted to double wrap a function."
  this.stack = new Error().stack
}

function setupProfiler() {
  // reset depth and intents, this needs to be done each tick.
  depth = 0
  intents = 0
  Game.profiler = {
    stream(duration: number, filter?: string) {
      setupMemory("stream", duration || 10, filter)
    },
    email(duration: number, filter?: string) {
      setupMemory("email", duration || 100, filter)
    },
    profile(duration: number, filter?: string) {
      setupMemory("profile", duration || 100, filter)
    },
    background(filter?: string) {
      setupMemory("background", -1, filter)
    },
    restart() {
      if (Profiler.isProfiling()) {
        const filter = Mem.filter
        let duration = -1
        if (Mem.disableTick > 0) {
          // Calculate the original duration, profile is enabled on the tick after the first call,
          // so add 1.
          duration = Mem.disableTick - Mem.enabledTick + 1
        }
        const type = Mem.type
        setupMemory(type, duration, filter)
      }
    },
    reset: resetMemory,
    output: Profiler.output,
  }
}

function setupMemory(profileType: string, duration: number, filter?: string) {
  console.log(`Profiling for ${duration} ticks (${filter || "no"} filter)`)
  resetMemory()
  const disableTick = duration > 0 ? Game.time + duration : -1
  Mem = {
    map: {},
    totalTime: 0,
    totalIntents: 0,
    enabledTick: Game.time + 1,
    disableTick,
    type: profileType,
    filter,
  }
}

function resetMemory() {
  Mem = {
    enabledTick: -1,
    disableTick: -1,
    type: "",
    totalTime: -1,
    totalIntents: -1,
    map: {},
  }
}

function getFilter() {
  return Mem.filter
}

const functionBlackList = [
  "getUsed", // Let's avoid wrapping this... may lead to recursion issues and should be inexpensive.
  "isEqualTo",
  "structure",
  "constructor", // es6 class constructors need to be called with `new`
]

const commonProperties = ["length", "name", "arguments", "caller", "prototype"]

function wrapFunction<T extends Function>(name: string, originalFunction: T): T {
  if ((originalFunction as any).profilerWrapped) {
    console.log(`Can't wrap ${name}`)
    throw new (AlreadyWrappedError as any)()
  }
  function wrappedFunction(this: any) {
    if (!Profiler.isProfiling()) {
      if (this && this.constructor === wrappedFunction) {
        return new (originalFunction as any)(...arguments)
      }
      return originalFunction.apply(this, arguments)
    }

    const nameMatchesFilter = name === getFilter()
    const start = Game.cpu.getUsed()
    const startIntents = intents
    if (nameMatchesFilter) {
      depth++
    }
    let result
    if (this && this.constructor === wrappedFunction) {
      result = new (originalFunction as any)(...arguments)
    } else {
      result = originalFunction.apply(this, arguments)
    }
    if (depth > 0 || !getFilter()) {
      const end = Game.cpu.getUsed()
      if (result === OK && Profiler.intents.has(name)) intents++
      Profiler.record(name, end - start, intents - startIntents)
    }
    if (nameMatchesFilter) {
      depth--
    }
    return result
  }

  wrappedFunction.profilerWrapped = true
  wrappedFunction.toString = () => `// screeps-profiler wrapped function:\n${originalFunction.toString()}`

  Object.getOwnPropertyNames(originalFunction).forEach(property => {
    if (!commonProperties.includes(property)) {
      ;(wrappedFunction as any)[property] = (originalFunction as any)[property]
    }
  })

  return wrappedFunction as any
}

function hookUpPrototypes() {
  Profiler.prototypes.forEach(proto => {
    profileObjectFunctions(proto.val, proto.name)
  })
}

function profileObjectFunctions<T extends any>(object: T, label: string): T {
  if ((object as any).prototype) {
    profileObjectFunctions((object as any).prototype, label)
  }
  const objectToWrap = object

  Object.getOwnPropertyNames(objectToWrap).forEach(functionName => {
    const extendedLabel = `${label}.${functionName}`

    const isBlackListed = functionBlackList.indexOf(functionName) !== -1
    if (isBlackListed) {
      return
    }

    const descriptor = Object.getOwnPropertyDescriptor(objectToWrap, functionName)
    if (!descriptor) {
      return
    }

    const hasAccessor = descriptor.get || descriptor.set
    if (hasAccessor) {
      const configurable = descriptor.configurable
      if (!configurable) {
        return
      }

      const profileDescriptor: any = {}

      if (descriptor.get) {
        const extendedLabelGet = `${extendedLabel}:get`
        profileDescriptor.get = profileFunction(descriptor.get, extendedLabelGet)
      }

      if (descriptor.set) {
        const extendedLabelSet = `${extendedLabel}:set`
        profileDescriptor.set = profileFunction(descriptor.set, extendedLabelSet)
      }

      Object.defineProperty(objectToWrap, functionName, profileDescriptor)
      return
    }

    const isFunction = typeof descriptor.value === "function"
    if (!isFunction || !descriptor.writable) {
      return
    }
    const originalFunction: any = (objectToWrap as any)[functionName]
    ;(objectToWrap as any)[functionName] = profileFunction(originalFunction, extendedLabel)
  })

  return objectToWrap
}

function profileFunction<T extends Function>(fn: T, functionName?: string): T {
  const fnName = functionName || fn.name
  if (!fnName) {
    console.log("Couldn't find a function name for - ", fn)
    console.log("Will not profile this function.")
    return fn
  }

  return wrapFunction(fnName, fn)
}

const Profiler = {
  printProfile() {
    console.log(Profiler.output())
  },

  emailProfile() {
    Game.notify(Profiler.output(1000))
  },

  output(passedOutputLengthLimit?: number) {
    const outputLengthLimit = passedOutputLengthLimit || 2000
    if (!Mem || !Mem.enabledTick) {
      return "Profiler not active."
    }
    const endTick = Math.min(Mem.disableTick < 0 ? Game.time : Mem.disableTick, Game.time)
    const startTick = Mem.enabledTick
    const elapsedTicks = endTick - startTick + 1
    const intentsTime = Mem.totalIntents * intentCost
    const processingTime = Mem.totalTime - intentsTime

    const header = [
      "p-time/call",
      "i-time/call",
      "time/call",
      "intents/call",
      "calls/tick",
      "intents/tick",
      "p-time/tick",
      "i-time/tick",
      "time/tick",
      "intent ratio",
      "function",
    ].join("\t")
    const footer = [
      `Avg p-CPU per tick: ${(processingTime / elapsedTicks).toFixed(2)}`,
      `Avg i-CPU per tick: ${(intentsTime / elapsedTicks).toFixed(2)}`,
      `Avg CPU per tick: ${(Mem.totalTime / elapsedTicks).toFixed(2)}`,
      `Avg intents per tick: ${(Mem.totalIntents / elapsedTicks).toFixed(2)} (${((intentsTime / Mem.totalTime) * 100).toFixed(2)}%)`,
      `Ticks profiled: ${elapsedTicks}`,
    ].join("\t\t")

    const lines = [header]

    let currentLength = header.length + 1 + footer.length
    const sums = { accountedTotalTime: 0 }
    const allLines = Profiler.lines(sums)
    let done = false
    while (!done && allLines.length) {
      const line = allLines.shift()
      // each line added adds the line length plus a new line character.
      if (line && currentLength + line.length + 1 < outputLengthLimit) {
        lines.push(line)
        currentLength += line.length + 1
      } else {
        done = true
      }
    }

    lines.push("")
    lines.push(footer)

    return lines.join("\n")
  },

  lines(sums: { accountedTotalTime: number }) {
    const endTick = Math.min(Mem.disableTick < 0 ? Game.time : Mem.disableTick, Game.time)
    const startTick = Mem.enabledTick
    const elapsedTicks = endTick - startTick + 1
    const stats = Object.keys(Mem.map)
      .map(functionName => {
        const functionCalls = Mem.map[functionName]
        const intentsTime = functionCalls.intents * intentCost
        const processingTime = functionCalls.time - intentsTime
        sums.accountedTotalTime += functionCalls.time
        return {
          processingTimePerCall: processingTime / functionCalls.calls,
          intentsTimePerCall: intentsTime / functionCalls.calls,
          timePerCall: functionCalls.time / functionCalls.calls,
          intentsPerCall: functionCalls.intents / functionCalls.calls,
          avgCalls: functionCalls.calls / elapsedTicks,
          avgIntents: functionCalls.intents / elapsedTicks,
          avgProcessingTime: processingTime / elapsedTicks,
          avgIntentsTime: intentsTime / elapsedTicks,
          avgTime: functionCalls.time / elapsedTicks,
          intentRatio: (intentsTime / functionCalls.time) * 100,
          name: functionName,
        }
      })
      .sort((val1, val2) => val2.avgTime - val1.avgTime)

    const lines = stats.map(data => {
      return [
        data.processingTimePerCall.toFixed(3),
        data.intentsTimePerCall.toFixed(3),
        data.timePerCall.toFixed(3),
        data.intentsPerCall.toFixed(1),
        data.avgCalls.toFixed(1),
        data.avgIntents.toFixed(1),
        data.avgProcessingTime.toFixed(3),
        data.avgIntentsTime.toFixed(3),
        data.avgTime.toFixed(3),
        data.intentRatio.toFixed(2) + "%",
        data.name,
      ].join("\t\t")
    })

    return lines
  },

  prototypes: [
    { name: "Game", val: Game },
    { name: "Game.map", val: Game.map },
    { name: "Game.market", val: Game.market },
    { name: "PathFinder", val: PathFinder },
    { name: "PathFinder.CostMatrix", val: PathFinder.CostMatrix },
    { name: "RawMemory", val: RawMemory },
    { name: "ConstructionSite", val: ConstructionSite },
    { name: "Creep", val: Creep },
    { name: "Flag", val: Flag },
    { name: "PowerCreep", val: PowerCreep },
    { name: "Room", val: Room },
    { name: "RoomPosition", val: RoomPosition },
    { name: "RoomVisual", val: RoomVisual },
    { name: "Structure", val: Structure },
    { name: "StructureController", val: StructureController },
    { name: "StructureFactory", val: StructureFactory },
    { name: "StructureLab", val: StructureLab },
    { name: "StructureLink", val: StructureLink },
    { name: "StructureNuker", val: StructureNuker },
    { name: "StructureObserver", val: StructureObserver },
    { name: "StructurePowerSpawn", val: StructurePowerSpawn },
    { name: "StructureRampart", val: StructureRampart },
    { name: "StructureSpawn", val: StructureSpawn },
    { name: "StructureSpawn.Spawning", val: StructureSpawn.Spawning },
    { name: "StructureTerminal", val: StructureTerminal },
    { name: "StructureTower", val: StructureTower },
  ],

  intents: new Set([
    "Game.notify",
    "Game.market.cancelOrder",
    "Game.market.changeOrderPrice",
    "Game.market.createOrder",
    "Game.market.deal",
    "Game.market.extendOrder",
    "ConstructionSite.remove",
    "Creep.attack",
    "Creep.attackController",
    "Creep.build",
    "Creep.claimController",
    "Creep.dismantle",
    "Creep.drop",
    "Creep.generateSafeMode",
    "Creep.harvest",
    "Creep.heal",
    "Creep.move",
    // "Creep.moveByPath", // apidocs says this has an intent cost, but in reality the cost is in Creep.move, not in this one
    "Creep.notifyWhenAttacked",
    "Creep.pickup",
    "Creep.rangedAttack",
    "Creep.rangedHeal",
    "Creep.rangedMassAttack",
    "Creep.repair",
    "Creep.reserveController",
    "Creep.signController",
    "Creep.suicide",
    "Creep.transfer",
    "Creep.upgradeController",
    "Creep.withdraw",
    "Flag.remove",
    "Flag.setColor",
    "Flag.setPosition",
    "PowerCreep.create",
    "PowerCreep.delete",
    "PowerCreep.drop",
    "PowerCreep.enableRoom",
    "PowerCreep.move",
    // "PowerCreep.moveByPath", // see comment on Creep.moveByPath
    "PowerCreep.notifyWhenAttacked",
    "PowerCreep.pickup",
    "PowerCreep.renew",
    "PowerCreep.spawn",
    "PowerCreep.suicide",
    "PowerCreep.transfer",
    "PowerCreep.upgrade",
    "PowerCreep.usePower",
    "PowerCreep.withdraw",
    "Room.createConstructionSite",
    "Room.createFlag",
    "RoomPosition.createConstructionSite",
    "RoomPosition.createFlag",
    "Structure.destroy",
    "Structure.notifyWhenAttacked",
    "StructureController.activateSafeMode",
    "StructureController.unclaim",
    "StructureFactory.produce",
    "StructureLab.boostCreep",
    "StructureLab.reverseReaction",
    "StructureLab.runReaction",
    "StructureLab.unboostCreep",
    "StructureLink.transferEnergy",
    "StructureNuker.launchNuke",
    "StructureObserver.observeRoom",
    "StructurePowerSpawn.processPower",
    "StructureRampart.setPublic",
    "StructureSpawn.spawnCreep",
    "StructureSpawn.recycleCreep",
    "StructureSpawn.renewCreep",
    "StructureSpawn.Spawning.cancel",
    "StructureSpawn.Spawning.setDirections",
    "StructureTerminal.send",
    "StructureTower.attack",
    "StructureTower.heal",
    "StructureTower.repair",
  ]),

  record(functionName: string, time: number, intents: number) {
    if (!Mem.map[functionName]) {
      Mem.map[functionName] = {
        time: 0,
        calls: 0,
        intents: 0,
      }
    }
    Mem.map[functionName].calls++
    Mem.map[functionName].time += time
    Mem.map[functionName].intents += intents
  },

  endTick() {
    if (Game.time >= Mem.enabledTick) {
      const cpuUsed = Game.cpu.getUsed()
      Mem.totalTime += cpuUsed
      Mem.totalIntents += intents
      Profiler.report()
    }
  },

  report() {
    if (Profiler.shouldPrint()) {
      Profiler.printProfile()
    } else if (Profiler.shouldEmail()) {
      Profiler.emailProfile()
    }
  },

  isProfiling() {
    if (!enabled || !Mem) {
      return false
    }
    return Mem.disableTick < 0 || Game.time <= Mem.disableTick
  },

  type() {
    return Mem.type
  },

  shouldPrint() {
    const streaming = Profiler.type() === "stream"
    const profiling = Profiler.type() === "profile"
    const onEndingTick = Mem.disableTick === Game.time
    return streaming || (profiling && onEndingTick)
  },

  shouldEmail() {
    return Profiler.type() === "email" && Mem.disableTick === Game.time
  },
}

export default {
  wrap<T extends Function>(callback: T): T {
    if (enabled) {
      setupProfiler()
    }

    if (Profiler.isProfiling()) {
      const returnVal = callback()
      Profiler.endTick()
      return returnVal
    }

    return callback()
  },

  enable() {
    enabled = true
    if (!Mem) resetMemory()
    hookUpPrototypes()
  },

  output: Profiler.output,

  registerObject: profileObjectFunctions,
  registerFN: profileFunction,
  registerClass: profileObjectFunctions,
}
