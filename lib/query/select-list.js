import Pass from './pass.js';
import Expression from './expression.js';
import * as aggregate from './aggregate.js';

export default class SelectList extends Pass {
    constructor(list) {
        super();

        this.list = list;
    }

    run(tables, from, rows, group) {
        let columns = from.columns;
        if (this.isSingleLine(this.list)) {
            return [this.list.reduce((all, what) => {
                if (what.run) {
                    all.push(what.run(tables, columns, rows, []));
                } else {
                    throw new Error('Malformed list expression');
                }
                return all;
            }, [])];
        } else if (group.group.length) {
            let grby = []; // indexes of group by columns
            let aggr = []; // indexes of aggregate function calls
            this.list.forEach((entry, i) => {
                if (entry.kind == 'aggregate') {
                    aggr.push(i);
                } else if (group.group.some(ex => ex.toString() === entry.toString())) {
                    grby.push(i);
                }
            });
            if (aggr.length && grby.length + aggr.length === this.list.length) {
                let groups = rows.reduce((all, row) => {
                    let gbValues = grby.reduce((all2, idx) => {
                        all2.push(this.list[idx].run(tables, columns, rows, row));
                        return all2;
                    }, []);
                    let key = JSON.stringify(gbValues);
                    all[key] = all[key] || { values: gbValues, rws: [] };
                    all[key].rws.push(row);
                    return all;
                }, []);
                return Object.keys(groups).map(key => {
                    let { values, rws } = groups[key];
                    return this.list.map((ex, idx) => {
                        if (grby.includes(idx)) {
                            return values.shift();
                        } else {
                            return ex.run(tables, columns, rws, []);
                        }
                    });
                }, []);
            } else {
                Pass.malformed('group by columns don\'t match');
            }

            return rows;
        } else {
            if (this.list.some(ex => ex.kind === 'aggregate')) {
                Pass.malformed('aggregate functions without group by')
            }
            return rows.map(row => {
                return this.list.reduce((all, what) => {
                    if (what.run) {
                        all.push(what.run(tables, columns, rows, row));
                    } else if (what.special === '*') {
                        all.push(...row);
                        // throw new Error('A list item without an expression, check this')
                    }
                    return all;
                }, []);
            });
        }
    }

    prepared(from) {
        let original = org => org.map(part => part.type === 'expression' ? original(part.original) : part.token).join(' ').trim();

        return this.list.reduce((all, item) => {
            if (item.alias) {
                all.push(item.alias);
            } else if (item.name) {
                all.push(item.name);
            // } else if (item.original) {
            //     all.push(original(item.original));
            } else if (item.special === '*') {
                all.push(...from.columns.map(({name}) => name));
                // from.forEach(table => all.push(...table.names));
            } else {
                all.push(item.toString());
            }
            return all;
        }, []);
    }

    isSingleLine(list) {
        return list.every(ex => ['aggregate', 'string', 'number'].includes(ex.kind) || ex.children && this.isSingleLine(ex.children));
    }

    static build(tokens, eaten, Select) {
        let result = [];

        while (true) {
            tokens.length || Pass.unterminated();

            if (tokens[0].token === '*') {
                eaten.push(tokens.shift());
                result.push({
                    special: '*',
                    toString: () => '*',
                });
            } else {
                let expression = Expression.build(tokens, eaten, Select);
                if (!expression) {
                    Pass.malformed();
                }
    
                let def = expression;
                if (tokens[0]) {
                    if (tokens[0].lc === 'as' && tokens[1] && ['identifier', 'reserved'].includes(tokens[1].type)) {
                        def.alias = tokens[1].token;
                        eaten.push(...tokens.splice(0, 2));
                    } else if (tokens[0].type === 'identifier' || tokens[0].type === 'reserved' && tokens[0].type in aggregate) {
                        def.alias = tokens[0].token;
                        eaten.push(tokens.shift());
                    }
                }
    
                result.push(def);
            }

            if (tokens[0] && tokens[0].token === ',') {
                eaten.push(tokens.shift());
            } else {
                break;
            }
        }

        return new SelectList(result);
    }
}
