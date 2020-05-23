import Pass from './pass.js';
import Expression from './expression.js';

export default class SelectWhere extends Pass {
    constructor(where) {
        super();
        this.where = where;
    }

    run(allTables, tables, selectList, rows = undefined) {
        let columns = tables.reduce((all, table) => {
            all.push(...table.names.map(name => ({ table: table.name, name: name })));
            return all;
        }, []);
        selectList.list && selectList.list.forEach(item => item.alias && columns.push({ expression: item.expression, alias: item.alias }));
        let next;
        let result = [];
        if (rows) {
            // having clause
            rows.forEach(row => {
                let pre = selectList.list.reduce((all, ex, i) => {
                });
                if (!this.where || this.where.run(allTables, columns, rows, row)) {
                    result.push(row);
                }
            });
        } else {
            // where clause
            let iterator = this.getLine(tables);
            while ((next = iterator.next()) && !next.done) {
                let row = next.value;
                if (!this.where || this.where.run(allTables, columns, [], row)) {
                    result.push(row);
                }
            }
        }
        return result;
    }

    *getLine(tables) {
        let table = tables[0];
        for (let i = 0; i < table.height; i ++) {
            let row = table.rows[i].slice();
            let iterator = tables.length > 1 ? this.getLine(tables.slice(1)) : undefined;
            if (iterator) {
                let next;
                while ((next = iterator.next()) && !next.done) {
                    yield [...row, ...next.value];
                }
            } else {
                yield row;
            }
        }

        // yield undefined;
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