import { stablematch } from "./stablematch";


describe('stablematch', () => {
    it('should pair results (case 1), ignoring capacity', () => {
        let proposers = [{value: 1}, {value: 5}, {value: 10}];
        let accepters = [{value: 2}, {value: 4}, {value: 8}];
        let matchFunction = (a: number, b: number) => ({rating: Math.abs(a - b), match: null});

        let matches = stablematch(proposers, accepters, matchFunction);
        expect(matches).toHaveLength(3);
        expect(matches[0]).toMatchObject([1, 2, null])
    })
    it('should pair results (case 2), ignoring capacity', () => {
        let proposers = [{value: 1}, {value: 5}, {value: 10}];
        let accepters = [{value: 4}, {value: 9}, {value: 14}];
        let matchFunction = (a: number, b: number) => ({rating: Math.abs(a - b), match: null});

        let matches = stablematch(proposers, accepters, matchFunction);
        expect(matches).toHaveLength(3);
        expect(matches[0]).toMatchObject([5, 4, null])
    })
    it('should pair results (case 1), with capacity', () => {
        let proposers = [{value: 1}, {value: 5, capacity: 2}, {value: 10}];
        let accepters = [{value: 2}, {value: 4}, {value: 8}, {value: 9}];
        let matchFunction = (a: number, b: number) => ({rating: Math.abs(a - b), match: null});

        let matches = stablematch(proposers, accepters, matchFunction);
        expect(matches).toHaveLength(4);
        expect(matches).toContainEqual([1, 2, null])
        expect(matches).toContainEqual([5, 8, null])
    })
    it('should pair results (case 2), with capacity', () => {
        let proposers = [{value: 1}, {value: 5, capacity: 3}, {value: 10}];
        let accepters = [{value: 2}, {value: 4}, {value: 7}, {value: 6}];
        let matchFunction = (a: number, b: number) => ({rating: Math.abs(a - b), match: null});

        let matches = stablematch(proposers, accepters, matchFunction);
        console.log(matches);
        expect(matches).toHaveLength(4);
        expect(matches).toContainEqual([1, 2, null])
        expect(matches).toContainEqual([5, 4, null])
        expect(matches).toContainEqual([5, 7, null])
        expect(matches).toContainEqual([5, 6, null])
    })
})
