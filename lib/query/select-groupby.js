import Pass from './pass.js';
import Expression from './expression.js';

export default class SelectGroupBy {
    constructor(group) {
        this.group = group;
    }

    run(tables, columns, rows) {
        if (!this.group.length) {
            return rows;
        }
    }

    static build(walk, Select) {
        let result = [];
        if (walk.perhaps.lc('group')) {
            walk.must.lc('by');
            while (!walk.empty) {
                let expression = Expression.build(walk, Select);
                if (!expression) {
                    Pass.unexpected(walk.ahead[0].token);
                }
                result.push(expression);

                if (!walk.perhaps.lc(',')) {
                    break;
                }
            }
        }

        return new SelectGroupBy(result);
    }
}
