import { runLabLogic } from "./Labs/Labs";
import { planLabOrders } from "./Labs/planLabOrders";

export const runLabs = () => {
  for (let office in Memory.offices) {
    planLabOrders(office);
    runLabLogic(office);
  }
}
