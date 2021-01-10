import Pass from './pass.js';
import cast from '../cast.js';

export default class SelectLimit extends Pass {
    constructor(limit) {
        super();

        this.limit = limit;
    }

    run(rows) {
        if (this.limit) {
            return rows.slice(this.limit.offset, this.limit.offset + this.limit.limit);
        } else {
            return rows;
        }
    }

    static build(walk, Select) {
        let limit = walk.perhaps.lc('limit');
        if (limit) {
            let offset = 0;
            let limit;
            let first = walk.must.type('number');
            if (walk.perhaps.lc(',') || walk.perhaps.lc('offset')) {
                let second = walk.must.type('number');
                offset = cast(first.token, 'number');
                limit = cast(second.token, 'number');
            } else {
                limit = cast(first.token, 'number');
            }
            return new SelectLimit({ offset, limit });
        } else {
            return new SelectLimit();
        }
    }
}
