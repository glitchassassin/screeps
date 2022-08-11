import { DetailLedger } from 'Ledger';

export class AccuracyLedger {
  static Ledger = new DetailLedger();
  static id(office: string) {
    return `a_${office}`;
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

export function reportAccuracyLedger() {
  console.log('\nAccuracy Ledger\n');
  for (const room in Memory.dledger) {
    if (!room.startsWith('a_')) continue;
    // AccuracyLedger.reset(room.replace('a_', ''));
    const ledger = Memory.dledger[room];
    console.log(
      room,
      Game.time - ledger.created,
      (-(ledger.value.transfer ?? 0) + -(ledger.value.drop ?? 0) + -(ledger.value.used ?? 0)) /
        (ledger.value.harvest ?? 0),
      JSON.stringify(ledger.value)
    );
  }
}
