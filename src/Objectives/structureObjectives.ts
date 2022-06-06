import { PrioritizedObjectives } from ".";


export const structureObjectives = () => {
    for (let o of PrioritizedObjectives) {
        o.structures()
    }
}
