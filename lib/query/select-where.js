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
        return this.where ? rows.filter(row => this.where.run(allTables, columns, [], row)) : rows;
    }

    static build(walk, Select) {
        if (walk.perhaps.lc('where')) {
            let expression = Expression.build(walk, Select);
            if (expression) {
                return new SelectWhere(expression);
            } else {
                Pass.expected('something that follows WHERE');
            }
        } else {
            return new SelectWhere();
        }
    }
};