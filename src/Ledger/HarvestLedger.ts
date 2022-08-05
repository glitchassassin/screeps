import { Ledger } from 'Ledger';

export class HarvestLedger {
  static Ledger = new Ledger();
  static id(office: string, source: Id<Source>) {
    return `r_${office}${source}`;
  }
  static get(office: string, sourceId: Id<Source>) {
    return this.Ledger.get(this.id(office, sourceId));
  }
  static record(office: string, sourceId: Id<Source>, value: number) {
    return this.Ledger.record(this.id(office, sourceId), value);
  }
}
