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

    static build(tokens, eaten, Select) {
        if (tokens[0] && tokens[0].lc === 'limit') {
            let offset;
            let limit;
            if (tokens[1] && tokens[1].type === 'number') {
                if (tokens[2] && (tokens[2].token === ',' || tokens[2].lc === 'offset') && tokens[3] && tokens[3].type === 'number') {
                    offset = cast(tokens[1].token, 'number');
                    limit = cast(tokens[3].token, 'number');
                    eaten.push(...tokens.splice(0, 4));
                } else {
                    offset = 0;
                    limit = cast(tokens[1].token, 'number');
                    eaten.push(...tokens.splice(0, 2));
                }
            } else {
                Pass.malformed('LIMIT');
            }
            return new SelectLimit({ offset, limit });
        } else {
            return new SelectLimit();
        }
    }
}
