import Pass from './pass.js';
import aggregates from './aggregate.js';
import Expression from './expression.js';

export default class SelectFrom extends Pass {
    constructor(from) {
        super();

        this.from = from;
    }

    get length() {
        return this.from && this.from.length || 0;
    }

    run(tables) {
        if (!this.length) {
            return [];
        }

        let inners = this.from.map(def => {
            if (!tables[def.table]) {
                throw new Error('unknown table ' + def.table);
            }

            if (def.join) {
                let leftColumns = tables[def.table].names.map(name => ({ table: def.table, name }));
                let left = tables[def.table].rows.map(r => r.slice());
                def.join.forEach(ddef => {
                    if (!tables[ddef.table]) {
                        throw new Error('unknown table ' + ddef.table);
                    }
                    let joined = [];
                    let right = tables[ddef.table].rows;
                    let rightColumns = tables[ddef.table].names.map(name => ({ table: ddef.table, name }));
                    let joinedColumns = leftColumns.concat(rightColumns);

                    let predicate;
                    if (ddef.on) {
                        predicate = (lr, rr, both) => ddef.on.run(tables, joinedColumns, [], both);
                    } else if (ddef.using) {
                        let lcols = ddef.using.map(name => leftColumns.findIndex(d => d.table === def.table && d.name === name.token));
                        let rcols = ddef.using.map(name => rightColumns.findIndex(d => d.name === name.token));
                        if (lcols.includes(-1) || rcols.includes(-1)) {
                            throw new Error('invalid using fields');
                        }
                        predicate = (lr, rr) => lcols.every((idx, i) => lr[idx] === rr[rcols[i]]);
                    } else if (ddef.natural) {
                        let common = tables[def.table].names.filter(n => tables[ddef.table].names.includes(n));
                        if (!common.length) {
                            throw new Error('invalid natural join');
                        }
                        let lcols = common.map(name => leftColumns.findIndex(d => d.table === def.table && d.name === name));
                        let rcols = common.map(name => rightColumns.findIndex(d => d.name === name));
                        predicate = (lr, rr) => lcols.every((idx, i) => lr[idx] === rr[rcols[i]]);
                    }

                    if (ddef.join === 'right') {
                        right.forEach(rr => {
                            let one = false;
                            left.forEach(lr => {
                                let both = [...lr, ...rr];
                                let pass = !predicate || predicate(lr, rr, both);
                                pass && joined.push(both);
                                one = one || pass;
                            });
                            one || joined.push([...leftColumns.map(v => null), ...rr]);
                        });
                    } else {
                        left.forEach(lr => {
                            let one = ddef.join === 'straight';
                            right.forEach(rr => {
                                let both = [...lr, ...rr];
                                let pass = !predicate || predicate(lr, rr, both);
                                pass && joined.push(both);
                                one = one || pass;
                            });
                            one || joined.push([...lr, ...rightColumns.map(v => null)]);
                        });
                    }

                    left = joined;
                    leftColumns = leftColumns.concat(rightColumns);
                });

                return {
                    columns: leftColumns,
                    rows: left,
                };
            } else {
                return {
                    columns: tables[def.table].names.map(name => ({ table: def.table, name: name })),
                    rows: tables[def.table].rows,
                }
            }
        });

        let columns = inners.reduce((all, cr) => (all.push(...cr.columns), all), []);
        let rows = [];
        let iterator = this.getLine(inners);
        let next;
        while ((next = iterator.next()) && !next.done) {
            rows.push(next.value);
        }

        return { columns, rows };
    }

    *getLine(tables) {
        let table = tables[0].rows;
        for (let i = 0; i < table.length; i++) {
            let row = table[i].slice();
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
        let result = [];

        if (!tokens[0]) {
            return;
        } else if (tokens[0].lc !== 'from') {
            Pass.unexpected(tokens[0].token);
        }

        eaten.push(tokens.shift());

        // [table] = name
        // [table] = name alias
        // [table] = name as alias
        // [table] = (select * from name)
        // [table] = (select * from name) alias
        // [table] = (select * from name) as alias

        // from [table]
        // from [table] (inner join | cross join | straight_join | left (outer) join | right (outer) join) [table] on
        // from [table] (inner join | cross join | straight_join | left (outer) join | right (outer) join) [table] using (column1, column2)
        // from [table] natural (inner / right / left / outer) join [table]
        // from [table] natural (inner / right / left / outer) join [table]

        while (tokens.length) {
            let def = SelectFrom.readTableNameOrQuery(tokens, eaten, Select);
            result.push(def);

            while (true) {
                let join = SelectFrom.readJoin(tokens, eaten, Select);
                if (join) {
                    def.join = def.join || [];
                    def.join.push(join);
                } else {
                    break;
                }
            }

            if (tokens[0] && tokens[0].token === ',') {
                eaten.push(tokens.shift());
            } else {
                break;
            }
        }

        return new SelectFrom(result);
    }

    static readJoin(tokens, eaten, Select) {
        if (!tokens.length) {
            return;
        }

        let bite = what => {
            if (what.every((t, i) => tokens[i] && tokens[i].lc === t)) {
                eaten.push(...tokens.splice(0, what.length));
                return true;
            }
        }

        // join
        // straight_join
        // inner join
        // cross join
        // left join
        // right join
        // left outer join
        // right outer join
        // natural join
        // natural inner join
        // natural left join
        // natural right join
        // natural left outer join
        // natural right outer join

        let straight = false;
        let left = false;
        let right = false;
        let natural = false;
        let naturalLeft = false;
        let naturalRight = false;
        if (bite(['join']) || bite(['straight_join']) || bite(['inner', 'join']) || bite(['cross', 'join'])) {
            straight = true;
        } else if (bite(['left', 'join']) || bite(['left', 'outer', 'join'])) {
            left = true;
        } else if (bite(['right', 'join']) || bite(['right', 'outer', 'join'])) {
            right = true;
        } else if (bite(['natural', 'join']) || bite(['natural', 'inner', 'join'])) {
            natural = true;
        } else if (bite(['natural', 'left', 'join']) || bite(['natural', 'left', 'outer', 'join'])) {
            naturalLeft = true;
        } else if (bite(['natural', 'right', 'join']) || bite(['natural', 'right', 'outer', 'join'])) {
            naturalRight = true;
        } else {
            return;
        }

        let def;
        if (straight || left || right) {
            def = SelectFrom.readTableNameOrQuery(tokens, eaten, Select);
            def || (tokens[0] ? Pass.unexpected(tokens[0].token) : Pass.expected('table def'));

            if (bite(['on'])) {
                def.on = Expression.build(tokens, eaten, Select);
                def.on || Pass.expected('on def');
            } else if (bite(['using'])) {
                bite(['(']) || Pass.expected('(');
                def.using = [];
                while (tokens.length) {
                    if (tokens[0].type === 'identifier') {
                        def.using.push(tokens[0]);
                        eaten.push(tokens.shift());
                        if (tokens[0] && tokens[0].token === ',') {
                            eaten.push(tokens.shift());
                        } else {
                            break;
                        }
                    } else {
                        Pass.unexpected(tokens[0].token);
                    }
                }
                bite([')']) || Pass.expected('(');
                def.using.length || Pass.expected('column list');
            }

            def.join = left ? 'left' : (right ? 'right' : 'straight');
        } else {
            def = SelectFrom.readTableName(tokens, eaten);
            def || Pass.unexpected(tokens[0].token);
            def.join = naturalLeft ? 'left' : (naturalRight ? 'right' : 'straight');
            def.natural = true;
        }

        return def;
    }

    static readTableNameOrQuery(tokens, eaten, Select) {
        if (!tokens[0]) {
            Pass.expected('from def');
        }

        let def;
        if (tokens[0].token === '(') {
            eaten.push(tokens.shift());
            def = SelectFrom.readQuery(tokens, eaten, Select);
            def = def || SelectFrom.readTableName(tokens, eaten);
            if (!def) {
                Pass.expected('from def');
            }
            if (!tokens[0] || tokens[0].token !== ')') {
                Pass.unexpected(tokens[0].token);
            }
            eaten.push(tokens.shift());
        } else {//kolya
            def = SelectFrom.readTableName(tokens, eaten);
            def || Pass.unexpected(tokens[0].token);
        }

        return def;
    }

    static readQuery(tokens, eaten, Select) {
        let select = Select.build(tokens, eaten);
        if (select) {
            let def = { type: 'query', query: select };
            if (tokens[0] && tokens[0].token === ')') {
                eaten.push(tokens.shift());
                def.alias = SelectFrom.readAlias(tokens, eaten);
            }

            return def;
        }
    }

    static readTableName(tokens, eaten) {
        if (tokens[0].type === 'identifier') {
            let def = { type: 'table', table: tokens[0].token };
            eaten.push(tokens.shift());
            def.alias = SelectFrom.readAlias(tokens, eaten);
            return def;
        }
    }

    static readAlias(tokens, eaten) {
        let alias;
        if (tokens[0] && tokens[0].lc === 'as') {
            eaten.push(tokens.shift());
            if (tokens[0] && (tokens[0].type === 'identifier' || tokens[0].type === 'reserved' && tokens[0].type in aggregates)) {
                alias = tokens[0].token;
                eaten.push(tokens.shift());
            } else {
                tokens[0] ? Pass.unexpected(tokens[0].token) : Pass.expected('identifier');
            }
        } else if (tokens[0] && (tokens[0].type === 'identifier' || tokens[0].type === 'reserved' && tokens[0].type in aggregates)) {
            alias = tokens[0].token;
            eaten.push(tokens.shift());
        }

        return alias;
    }
}
