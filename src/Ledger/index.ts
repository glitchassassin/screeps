interface LedgerItem {
  id: string;
  isValid: boolean;
  age: number;
  perTick: number;
  value: number;
  created: number;
}

interface DetailLedgerItem {
  id: string;
  isValid: boolean;
  age: number;
  perTick: number;
  value: Record<string, number>;
  created: number;
}

declare global {
  interface Memory {
    ledger: Record<string, { value: number; created: number }>;
    dledger: Record<string, { value: Record<string, number>; created: number }>;
  }
}

Memory.ledger ??= {};
Memory.dledger ??= {};

export class Ledger {
  constructor(private baseline: number = CREEP_LIFE_TIME, private interval: number = CREEP_LIFE_TIME * 5) {}
  reset(id: string): LedgerItem {
    Memory.ledger[id] = { value: 0, created: Game.time };
    return this.format(id);
  }
  isValid(id: string): boolean {
    return Game.time - Memory.ledger[id].created > this.baseline;
  }
  isExpired(id: string): boolean {
    return Game.time - Memory.ledger[id].created > this.interval;
  }
  get(id: string): LedgerItem {
    if (!Memory.ledger[id] || this.isExpired(id)) {
      return this.reset(id);
    }

    return this.format(id);
  }
  record(id: string, value: number): LedgerItem {
    const item = Memory.ledger[id];

    if (!Memory.ledger[id] || Game.time - item.created > this.interval) {
      this.reset(id);
    }

    Memory.ledger[id].value += value;
    return this.format(id);
  }
  format(id: string): LedgerItem {
    const age = Game.time - Memory.ledger[id].created;
    return {
      id,
      isValid: this.isValid(id),
      age,
      perTick: Memory.ledger[id].value / age,
      ...Memory.ledger[id]
    };
  }
}

export class DetailLedger {
  constructor(private baseline: number = CREEP_LIFE_TIME, private interval: number = CREEP_LIFE_TIME * 5) {}
  reset(id: string): DetailLedgerItem {
    Memory.dledger[id] = { value: {}, created: Game.time };
    return this.format(id);
  }
  isValid(id: string): boolean {
    return Game.time - Memory.dledger[id].created > this.baseline;
  }
  isExpired(id: string): boolean {
    return Game.time - Memory.dledger[id].created > this.interval;
  }
  get(id: string): DetailLedgerItem {
    if (!Memory.dledger[id] || this.isExpired(id)) {
      return this.reset(id);
    }

    return this.format(id);
  }
  record(id: string, label: string, value: number): DetailLedgerItem {
    const item = Memory.dledger[id];

    if (!Memory.dledger[id] || Game.time - item.created > this.interval) {
      this.reset(id);
    }

    Memory.dledger[id].value[label] = (Memory.dledger[id].value[label] ?? 0) + value;
    return this.format(id);
  }
  format(id: string): DetailLedgerItem {
    const age = Game.time - Memory.dledger[id].created;
    const perTick =
      Object.keys(Memory.dledger[id].value).reduce((sum, v) => sum + Memory.dledger[id].value[v], 0) / age;
    return {
      id,
      isValid: this.isValid(id),
      age,
      perTick,
      ...Memory.dledger[id]
    };
  }
}
