interface LedgerItem {
  id: string;
  isValid: boolean;
  age: number;
  perTick: number;
  value: number;
  created: number;
}

declare global {
  interface Memory {
    ledger: Record<string, { value: number; created: number }>;
  }
}

Memory.ledger ??= {};

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
