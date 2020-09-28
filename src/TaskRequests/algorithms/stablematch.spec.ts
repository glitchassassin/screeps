import { inspect } from "util";
import { calculatePreferences, stablematch } from "./stablematch";

describe("stablematch", () => {
    it("should assemble preferences", () => {
        let proposers = ["A", "B", "C", "D"];
        let accepters = ["a", "b", "c", "d"];

        let result = calculatePreferences(proposers, accepters, (p, a) => {
            return {
                pRating: p.charCodeAt(0),
                aRating: a.charCodeAt(0),
                output: null,
            }
        });
        expect(result.accepters.size).toEqual(4);
        expect(result.accepters.get('a')?.size).toEqual(4)
        expect(result.accepters.get('a')?.get('A')).toMatchObject({"rating": 65, "value": "A"})
    })
    it("should calculate a stable match", () => {
        let proposers = ["A", "B", "C", "D"];
        let accepters = ["a", "b", "c", "d"];

        let result = stablematch(proposers, accepters, (p, a) => {
            return {
                pRating: p.charCodeAt(0),
                aRating: -a.charCodeAt(0),
                output: p + a,
            }
        });
        expect(result.length).toEqual(4);
        expect(result[0]).toEqual(['a', 'D', 'Da']);
    })
    it("should calculate a stable match with more proposers than accepters", () => {
        let proposers = ["A", "B", "C", "D", "E", "F"];
        let accepters = ["a", "b", "c", "d"];

        let result = stablematch(proposers, accepters, (p, a) => {
            return {
                pRating: p.charCodeAt(0),
                aRating: -a.charCodeAt(0),
                output: p + a,
            }
        });
        console.log(inspect(result, {depth: null}))
        expect(result.length).toEqual(4);
        expect(result[0]).toEqual(['a', 'F', 'Fa']);
    })
})
