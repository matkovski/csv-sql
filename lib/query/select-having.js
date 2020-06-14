import Pass from './pass.js';
import Expression from './expression.js';

export default class SelectHaving extends Pass {
    constructor(having) {
        super();
        this.having = having;
    }

    columns(from) {
        return from.reduce((all, table) => {
            all.push(...table.names.map(name => ({ table: table.name, name: name })));
            return all;
        }, []);
    }

    run(tables, from, rows, list, group) {
        if (!this.having) {
            return rows;
        }
        
        let columns = from.columns;
        let result = [];
        let grby = []; // indexes of group by columns
        let aggr = []; // indexes of aggregate function calls
        list.list.forEach((entry, i) => {
            if (entry.kind == 'aggregate') {
                aggr.push(i);
            } else if (group.group.some(ex => ex.toString() === entry.toString())) {
                grby.push(i);
            }
        });
        if (aggr.length && grby.length + aggr.length === list.list.length) {
            let groups = rows.reduce((all, row) => {
                let gbValues = grby.reduce((all2, idx) => {
                    all2.push(list.list[idx].run(tables, columns, rows, row));
                    return all2;
                }, []);
                let key = JSON.stringify(gbValues);
                all[key] = all[key] || { values: gbValues, rws: [] };
                all[key].rws.push(row);
                return all;
            }, []);
            return Object.keys(groups).reduce((all, key) => {
                let rws = groups[key].rws;
                if (this.having.run(tables, columns, rws, [])) {
                    all.push(...rws);
                }
                return all;
            }, []);
        } else {
            Pass.malformed('Malformed HAVING clause');
        }
        return result;
    }

    static build(tokens, eaten, Select) {
        if (tokens[0] && tokens[0].lc === 'having') {
            eaten.push(tokens.shift());

            let expression = Expression.build(tokens, eaten, Select);
            if (expression) {
                return new SelectHaving(expression);
            }
        } else {
            return new SelectHaving();
        }
    }
};