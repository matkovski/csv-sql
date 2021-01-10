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
            if (def.type === 'query') {
                return {
                    columns: def.query.from.run(tables).columns,
                    rows: def.query.run(tables).rows,
                };
            }
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

    static build(walk, Select) {
        let result = [];

        if (walk.empty) {
            return;
        }

        walk.must.lc('from');

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

        while (!walk.empty) {
            let def = SelectFrom.readTableNameOrQuery(walk, Select);
            result.push(def);

            while (true) {
                let join = SelectFrom.readJoin(walk, Select);
                if (join) {
                    def.join = def.join || [];
                    def.join.push(join);
                } else {
                    break;
                }
            }

            if (!walk.perhaps.lc(',')) {
                break;
            }
        }

        return new SelectFrom(result);
    }

    static readJoin(walk, Select) {
        if (walk.empty) {
            return;
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
        if (walk.perhaps.lc('join') || walk.perhaps.lc('straight_join') || walk.perhaps.lc(['inner', 'join']) || walk.perhaps.lc(['cross', 'join'])) {
            straight = true;
        } else if (walk.perhaps.lc(['left', 'join']) || walk.perhaps.lc(['left', 'outer', 'join'])) {
            left = true;
        } else if (walk.perhaps.lc(['right', 'join']) || walk.perhaps.lc(['right', 'outer', 'join'])) {
            right = true;
        } else if (walk.perhaps.lc(['natural', 'join']) || walk.perhaps.lc(['natural', 'inner', 'join'])) {
            natural = true;
        } else if (walk.perhaps.lc(['natural', 'left', 'join']) || walk.perhaps.lc(['natural', 'left', 'outer', 'join'])) {
            naturalLeft = true;
        } else if (walk.perhaps.lc(['natural', 'right', 'join']) || walk.perhaps.lc(['natural', 'right', 'outer', 'join'])) {
            naturalRight = true;
        } else {
            return;
        }

        let def;
        if (straight || left || right) {
            def = SelectFrom.readTableNameOrQuery(walk, Select);
            def || (walk.empty ? Pass.expected('table def') : Pass.unexpected(walk.ahead[0].token));

            if (walk.perhaps.lc('on')) {
                def.on = Expression.build(walk, Select);
                def.on || Pass.expected('on def');
            } else if (walk.perhaps.lc('using')) {
                walk.must.lc('(');
                def.using = [];
                while (!walk.empty) {
                    let ident = walk.must.type('identifier');
                    def.using.push(ident);
                    if (!walk.perhaps.lc(',')) {
                        break;
                    }
                }
                walk.must.lc(')');
                def.using.length || Pass.expected('column list');
            }

            def.join = left ? 'left' : (right ? 'right' : 'straight');
        } else {
            def = SelectFrom.readTableName(walk);
            def.join = naturalLeft ? 'left' : (naturalRight ? 'right' : 'straight');
            def.natural = true;
        }

        return def;
    }

    static readTableNameOrQuery(walk, Select) {
        if (walk.empty) {
            Pass.expected('from def');
        }

        let def;
        if (walk.perhaps.lc('(')) {
            def = SelectFrom.readQuery(walk, Select);
            def = def || SelectFrom.readTableName(walk);
            def || Pass.expected('from def');
        } else {//kolya
            def = SelectFrom.readTableName(walk);
        }

        return def;
    }

    static readQuery(walk, Select) {
        let select = Select.build(walk);
        if (select) {
            let def = { type: 'query', query: select };
            if (walk.perhaps.lc(')')) {
                def.alias = SelectFrom.readAlias(walk);
            }
            return def;
        }
    }

    static readTableName(walk) {
        let table = walk.must.type('identifier');
        let def = { type: 'table', table: table.token };
        def.alias = SelectFrom.readAlias(walk);
        return def;
    }

    static readAlias(walk) {
        let must = walk.perhaps.lc('as');
        let alias = walk.perhaps.type('identifier') || walk.perhaps.lc(lc => lc in aggregates);
        if (must && !alias) {
            Pass.expected('alias name');
        }
        return alias;
    }
}
