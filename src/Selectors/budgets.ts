export interface Budget {
    cpu: number,
    spawn: number,
    energy: number,
}

export const Budgets = new Map<string, Map<string, number>>();
export const FranchiseBudgetConstraints = new Map<string, Budget>();
export const LogisticsBudgetConstraints = new Map<string, Budget>();
export const ObjectiveBudgetConstraints = new Map<string, Map<string, Budget>>();
export const BaseBudgetConstraints = new Map<string, Budget>();
export const NetBudgetConstraints = new Map<string, Budget>();
