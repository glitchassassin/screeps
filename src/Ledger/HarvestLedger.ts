import { DetailLedger } from 'Ledger';
import { franchisesByOffice } from 'Selectors/Franchises/franchisesByOffice';

export class HarvestLedger {
  static Ledger = new DetailLedger();
  static id(office: string, source: Id<Source>) {
    return `r_${office}${source}`;
  }
  static reset(office: string, sourceId: Id<Source>) {
    return this.Ledger.reset(this.id(office, sourceId));
  }
  static get(office: string, sourceId: Id<Source>) {
    return this.Ledger.get(this.id(office, sourceId));
  }
  static record(office: string, sourceId: Id<Source>, label: string, value: number) {
    return this.Ledger.record(this.id(office, sourceId), label, value);
  }
}

export function reportHarvestLedger() {
  console.log('\nHarvest Ledger\n');
  for (const office in Memory.offices) {
    for (const { source, room } of franchisesByOffice(office, true)) {
      // HarvestLedger.reset(office);
      const ledger = HarvestLedger.get(office, source);
      console.log(office, room, ledger.age, JSON.stringify(ledger.value));
    }
  }
}
