import { Ledger } from 'Ledger';

export class AcquireLedger {
  static Ledger = new Ledger(CREEP_CLAIM_LIFE_TIME, CREEP_CLAIM_LIFE_TIME * 10);
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
