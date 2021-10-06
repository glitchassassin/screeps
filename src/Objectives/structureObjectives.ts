import { PrioritizedObjectives } from "./initializeObjectives";


export const structureObjectives = () => {
    for (let o of PrioritizedObjectives) {
        o.structures()
    }
}
