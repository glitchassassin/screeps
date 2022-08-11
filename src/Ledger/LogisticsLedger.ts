import { DetailLedger } from 'Ledger';

export class LogisticsLedger {
  static Ledger = new DetailLedger();
  static id(office: string) {
    return `l_${office}`;
  }
  static reset(office: string) {
    return this.Ledger.reset(this.id(office));
  }
  static get(office: string) {
    return this.Ledger.get(this.id(office));
  }
  static record(office: string, label: string, value: number) {
    return this.Ledger.record(this.id(office), label, value);
  }
}

export function reportLogisticsLedger() {
  console.log('\nLogistics Ledger\n');
  for (const office in Memory.offices) {
    // LogisticsLedger.reset(office);
    const ledger = LogisticsLedger.get(office);
    const outputs = (ledger.value.deposit ?? 0) + (ledger.value.decay ?? 0) + (ledger.value.death ?? 0);
    const inputs = (ledger.value.recover ?? 0) + (ledger.value.harvest ?? 0);
    const logisticsEfficiency = inputs ? -outputs / inputs : 0;
    console.log(office, ledger.age, logisticsEfficiency, JSON.stringify(ledger.value));
  }
}
