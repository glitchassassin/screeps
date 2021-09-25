export interface Budget {
    cpu: number,
    spawn: number,
    energy: number,
}
export type Ledger = Map<string, Budget>;
export type BudgetGenerator = (constraints: Budget) => Budget;

export const Budgets = new Map<string, Ledger>();
export const FixedBudgetConstraints = new Map<string, Budget>();
export const BaseBudgetConstraints = new Map<string, Budget>();
export const TotalBudgetConstraints = new Map<string, Budget>();
