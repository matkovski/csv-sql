import Pass from './pass.js';
import Expression from './expression.js';
import Select from './expression.js';

export default class InsertValues extends Pass {
    constructor(rows) {
        super();
        this.rows = rows;
    }

    run(tables) {
        return this.rows.map(row => row.map(col => col.run(tables, [], [], [])))
    }

    static build(walk) {
        if (!walk.perhaps.lc('values')) {
            return;
        }

        let rows = [];

        while (true) {
            if (!walk.perhaps.lc('(')) {
                break;
            }

            let row = [];

            while (true) {
                let expression = Expression.build(walk, Select);
                expression || Pass.expected('expression');
                row.push(expression);

                if (!walk.perhaps.lc(',')) {
                    break;
                }
            }

            walk.must.lc(')');

            rows.push(row);

            if (!walk.perhaps.lc(',')) {
                break;
            }
        }

        if (!rows.length) {
            Pass.expected('rows');
        }

        return new InsertValues(rows);
    }
}