import Pass from './pass.js';
import Expression from './expression.js';

export default class SelectWhere extends Pass {
    constructor(where) {
        super();
        this.where = where;
    }

    run(allTables, { columns, rows }, selectList) {
        columns = columns.slice();
        selectList && columns.push(...selectList.list.map(item => item.alias && { expression: item.toString(), alias: item.alias }).filter(yes => yes));
        // where clause
        return rows.filter(row => {
            return !this.where || this.where.run(allTables, columns, [], row);
        });
    }

    static build(tokens, eaten, Select) {
        if (tokens[0] && tokens[0].lc === 'where') {
            eaten.push(tokens.shift());

            let expression = Expression.build(tokens, eaten, Select);
            if (expression) {
                return new SelectWhere(expression);
            }
        } else {
            return new SelectWhere();
        }
    }
};