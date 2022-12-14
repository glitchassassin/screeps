import { ScannedFranchiseEvent } from 'Intel/events';
import { planFranchisePath } from 'Selectors/Franchises/planFranchisePath';

export const updateFranchisePaths = ({ office, source }: ScannedFranchiseEvent) => {
  planFranchisePath(office, source);
};
