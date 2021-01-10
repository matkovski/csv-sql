import Pass from './pass.js';

export default class InsertValues extends Pass {
    constructor(values) {
        super();
        this.values = values;
    }

    static build(walk) {
        if (!walk.perhaps.lc('values')) {
            return;
        }

        let sets = [];

        while (true) {
            if (!walk.perhaps.lc('(')) {
                break;
            }

            
        }

        if (!sets.length) {
            Pass.expected('rows');
        }

    }
}