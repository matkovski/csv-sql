import Pass from './pass.js';
import {cast, single} from '../cast.js';
import aggregates from './aggregate.js';
import functions from './functions.js';

let priority = ['or', 'and', '<', '>', '<=', '>=', '<>', '=', '+', '-', '/', '*'];
let operators = ['in', 'between', 'like'];

let patterns = [
    // numbers
    ts => {
        if (ts[0].type === 'number' && ts[1] && ts[1].token === '.' && ts[2] && ts[2].type === 'number') {
            return ((t1, t2) => ({
                kind: 'number',
                run: () => + (t1 + '.' + t2),
                length: 3,
                toString: () => t1 + '.' + t2,
            }))(ts[0].token, ts[2].token)
        } else if (ts[0].type === 'number') {
            return (token => ({
                kind: 'number',
                run: () => + token,
                length: 1,
                toString: () => token,
            }))(ts[0].token)
        }
    },

    // identifier or identifier.identifier
    ts => {
        if (ts[0].type === 'identifier' && ts[1] && ts[1].token === '.' && ts[2] && ts[2].type === 'identifier') {
            return ((tbl, clm) => ({
                kind: 'column',
                run: (allTables, columns, rows, row) => column(allTables, columns, rows, row, { name: clm, table: tbl }),
                length: 3,
                toString: () => ts[0].lc + '.' + ts[2].lc,
            }))(ts[0].token, ts[2].token);
        } else if (ts[0].type === 'identifier' && (!ts[1] || ts[1].token !== '(')) {
            return (clm => ({
                kind: 'column',
                run: (allTables, columns, rows, row) => column(allTables, columns, rows, row, { name: clm }),
                length: 1,
                toString: () => ts[0].token,
            }))(ts[0].token);
        }
    },

    // string
    ts => {
        if (ts[0].type === 'string') {
            return (token => ({
                kind: 'string',
                run: () => token.substr(1, token.length - 2),
                length: 1,
                toString: () => token, // token.substr(1, token.length - 2),
            }))(ts[0].token)
        }
    },

    // query
    ts => {
        if (ts.length >= 3 && ts[0].token === '(' && ts[1].type === 'query' && ts[2].token === ')') {
            return (q => ({
                kind: 'query',
                run: (allTables, columns, rows, row) => q.run(allTables),
                length: 3,
                toString: ts[1].toString,
            }))(ts[1].query);
        }
    },

    // something in something, something between something
    ts => {
        if (ts.length >= 3 && ts[0].type === 'expression' && ts[1].lc === 'in') {
            if (ts[2].token === '(') {
                let args = [];
                for (let i = 3; i < ts.length; i ++) {
                    if (ts[i].lc === ')') {
                        break;
                    }
                    args.push(ts[i]);
                }
                if (args.length) {
                    return ((what, where) => ({
                        kind: 'expression',
                        run: (allTables, columns, rows, row) => {
                            let l = single(what.run(allTables, columns, rows, row));
                            return where.some(v => l == single(v.run(allTables, columns, row)));
                        },
                        length: args.length + 4,
                        toString: () => ts[0].toString() + ' IN (' + where.map(v => v.toString()).join(', ') + ')',
                    }))(ts[0], args);
                }
            } else if (ts[2].type === 'query') {
                return ((what, where) => ({
                    kind: 'expression',
                    run: (allTables, columns, rows, row) => {
                        let w = single(what.run(allTables, columns, rows, row));
                        let sl = where.run(allTables);
                        if (!sl.rows) {
                            return false;
                        } else if (sl.rows[0].length === 1) {
                            return sl.rows.some(r => r[0] == w);
                        } else {
                            throw new Error('IN Subquery with more that one return column');
                        }
                    },
                }))(ts[0], ts[2]);
            }
        }
    },

    // identifier(expression, expression, ...)
    ts => {
        if (ts.length >= 3 && ['identifier', 'reserved'].includes(ts[0].type) && ts[1].token === '(') {
            let modifiers = [];
            let args = [];
            let i = 2;
            if (ts[2].token !== ')') {
                while (ts[i]) {
                    if (ts[i].type === 'reserved') {
                        // this can actually only be DISTINCT
                        modifiers.push(ts[i].lc);
                        i ++;
                    } else if (ts[i].type === 'expression' || ts[i].token === '*') {
                        if (ts[i].token === '*') {
                            ts[i].toString = () => '*';
                        }
                        args.push(ts[i]);
                        if (ts[i + 1].token === ',') {
                            i += 2;
                        } else if (ts[i + 1].token === ')') {
                            break;
                        } else {
                            Pass.unexpected(ts[i + 1].token);
                        }
                    } else {
                        Pass.unexpected(ts[i].token);
                    }
                }
            }
            return (token => ({
                kind: token.lc in aggregates ? 'aggregate' : 'function',
                children: args.filter(a => a.type === 'expression'),
                run: (allTables, columns, rows, row) => call(allTables, columns, rows, row, token.token, args),
                length: 3 + (args.length ? args.length * 2 - 1 : 0),
                modifiers: modifiers,
                toString: () => {
                    return ts[0].token + '(' + args.map(a => a.toString()).join(', ') + ')'
                },
            }))(ts[0]);
        }
    },

    // (expression)
    ts => {
        if (ts.length >= 3 && ts[0].token === '(' && ts[1].type === 'expression' && ts[2].token === ')') {
            return {
                type: 'expression',
                kind: ts[1].kind,
                run: ts[1].run,
                length: 3,
                toString: ts[1].toString,
            };
        }
    },
];

function column(allTables, columns, rows, row, coldef) {
    // TODO: support aliases, support expressions in select lists, pass the results of select-lists all over here
    let matching = columns.filter(selected => {
        if (coldef.table) {
            return coldef.table === selected.table && coldef.name === selected.name;
        } else if (selected.alias) {
            return coldef.name === selected.alias || selected.name === coldef.name;
        } else {
            return coldef.name === selected.name;
        }
    });
    
    if (!matching.length) {
        throw new Error('Unknown column: ' + coldef.name);
    } else if (matching.length > 1) {
        throw new Error('Ambiguous column name: ' + coldef.name);
    }

    if (matching[0].expression) {
        return matching[0].expression.run(allTables, columns, rows, row);
    } else {
        return row[columns.indexOf(matching[0])];
    }
}

function call(allTables, columns, rows, row, funcname, args) {
    if (!aggregates[funcname] && !functions[funcname]) {
        Pass.unexpected(funcname);
    }

    return (aggregates[funcname] || functions[funcname])(allTables, columns, rows, row, args);
}

function operator(allTables, columns, rows, row, oprtr, args) {
    // 'or', 'and', 'in', '<', '>', 'like', '<>', '=', '+', '-', '/', '*'
    let values = args.map(arg => single(arg.run(allTables, columns, rows, row)));
    if (oprtr === 'or') {
        return values.some(value => !!value);
    } else if (oprtr === 'and') {
        return values.every(value => !!value);
    } else if (oprtr === 'in') {
        if (values.length !== 2) {
            Pass.malformed();
        } else {
            return values[1].includes(values[0]);
        }
    } else if (oprtr === '<') {
        if (values.length !== 2) {
            Pass.malformed();
        } else {
            return cast(values[0], 'number') < cast(values[1], 'number');
        }
    } else if (oprtr === '<=') {
        if (values.length !== 2) {
            Pass.malformed();
        } else {
            return cast(values[0], 'number') <= cast(values[1], 'number');
        }
    } else if (oprtr === '>') {
        if (values.length !== 2) {
            Pass.malformed();
        } else {
            return cast(values[0], 'number') > cast(values[1], 'number');
        }
    } else if (oprtr === '>=') {
        if (values.length !== 2) {
            Pass.malformed();
        } else {
            return cast(values[0], 'number') >= cast(values[1], 'number');
        }
    } else if (oprtr === '=') {
        // TODO: proper comparison - true = 1, true = '1' etc.
        return values.reverse().reduce((yes, value) => equal(value, yes));
    } else if (oprtr === '+') {
        // TODO: cast all to numbers
        return values.reduce((all, val) => all + val, 0);
    } else if (oprtr === '-') {
        return values.reduce((all, val) => all + val);
    } else if (oprtr === '*') {
        return values.reduce((all, val) => all * val, 1);
    } else if (oprtr === '/') {
        return values.reduce((all, val) => parseInt(all, 10) / parseInt(val));
    } else if (oprtr === '<>') {
        // TODO: proper comparison - true = 1, true = '1' etc.
        return values.reverse().reduce((yes, value) => value !== yes);
    } else {
        Pass.unexpected(oprtr);
    }

    return oprtr;
}

function equal(one, two) {
    if (one === two) {
        return true;
    }

    if (typeof one === 'object' && one.rows) {
        one = one.rows[0] && one.rows[0][0];
    }

    if (typeof two === 'object' && two.rows) {
        two = two.rows[0] && two.rows[0][0];
    }

    // TODO: both might be dates
    if (typeof one === 'string' && typeof two === 'string') {
        return one === two;
    }

    let num1 = + one;
    let num2 = + two;
    if (isFinite(num1) && isFinite(num2)) {
        return num1 === num2;
    }

    return false;
}

export default class Expression extends Pass {
    constructor(where) {
        super();
        this.expression = where;
    }

    run(allTables, columns, rows, row) {
        return this.expression.run(allTables, columns, rows, row);
    }

    static build(walk, Select, canBeSelect = false) {
        if (canBeSelect) {
            let restart = walk.restart();
            let select = Select.build(restart);
            if (select) {
                return {
                    type: 'expression',
                    kind: 'query',
                    original: walk.skip(restart.walked),
                    query: select,
                    run: (allTables, columns, rows, row) => select.run(allTables),
                    toString: () => select.toString(),
                };
            }
        }

        let result = [];
        while (!walk.empty) {
            let last = result[result.length - 1];
            if (walk.perhaps.lc(',', true) || walk.perhaps.lc(')', true)) {
                break;
            }
            
            if (last && walk.perhaps.type(type => ['expression', 'identifier', 'query', 'number'].includes(last.type) && type === 'identifier', true)) {
                // a sort of special case - there's an expression followed by an identifier - this might be an alias, which we don't handle here
                break;
            }

            let token = walk.perhaps.lc(lc => aggregates[lc] || functions[lc] || ['distinct', 'and', 'or'].includes(lc) || operators.includes(lc)) || walk.perhaps.not.type('reserved');
            if (!token) {
                break;
            }

            let partial = Expression.buildBetween(walk, Select);
            partial = partial || Expression.buildInPartial(walk, Select);
            partial = partial || Expression.buildLikePartial(walk, Select);
            if (partial) {
                result.push(...partial);
            } else if (token.token === '(') {
                let inside = Pass.readInsides([token, ...walk.ahead], '(', ')');
                let looksLikeFunctionCall = last && (last.lc in functions || last.lc in aggregates);
                let argsLength = inside.length;
                if (argsLength) {
                    if (result.length && looksLikeFunctionCall) {
                        // an exception for expressions like count(*)
                        if (inside.length === 1 && inside[0].token === '*') {
                            let func = result.pop();
                            result.push(Expression.plainExpression([func, token, ...walk.ahead.slice(0, argsLength + 1)]));
                        } else {
                            // an exception for DISTINCT - it's the only thing that can legally appear here
                            let expression;
                            if (inside[0].lc === 'distinct') {
                                expression = Expression.build(walk.bind(inside.slice(1), []), Select, true);
                                expression.distinct = true;
                                result.push(token, expression, walk.ahead[argsLength]);
                            } else {
                                let args = [];
                                while (inside.length) {
                                    let expression = Expression.build(walk.bind(inside, []), Select, true);
                                    if (expression) {
                                        args.push(expression);
                                        if (inside[0] && inside[0].token === ',') {
                                            args.push(inside.shift());
                                        }
                                    } else {
                                        Pass.expected('expression');
                                    }
                                }
                                result.push(token, ...args, walk.ahead[argsLength]);
                            }
                            // result.push(token[0], ...inside, walk.ahead[argsLength]);
                        }
                    } else {
                        result.push(Expression.build(walk.bind(inside, []), Select, true));
                    }
                    walk.skip(argsLength + 1);
                } else if (looksLikeFunctionCall) {
                    result.push(token, ...walk.skip(2));
                } else {
                    Pass.unexpected(')');
                }
            } else {
                result.push(token);
            }
        }

        return Expression.breakDown(result, priority.slice(), Select);
    }

    static breakDown(tokens, ops, Select) {
        if (tokens.length === 1) {
            return Expression.plainExpression(tokens);
        }

        if (ops.length) {
            let op;
            do {
                op = ops.shift();
            } while (op && !tokens.some(t => t.lc === op));
            if (!op) {
                return Expression.plainExpression(tokens);
            }
            let parts = [[]];
            for (let i = 0; i < tokens.length; i ++) {
                if (tokens[i].lc === op) {
                    parts.push([]);
                } else {
                    parts[parts.length - 1].push(tokens[i]);
                }
            }

            let subparts = parts.map(part => Expression.breakDown(part, ops.slice(), Select));

            return {
                type: 'expression',
                kind: 'operator.' + op,
                children: subparts.filter(p => p.type === 'expression'),
                original: tokens.slice(),
                run: (allTables, columns, rows, row) => operator(allTables, columns, rows, row, op, subparts),
                toString: () => '(' + subparts.map(s => s.toString()).join(' ' + op + ' ') + ')',
            };
        } else {
            return Expression.plainExpression(tokens);
        }
    }

    static plainExpression(tokens) {
        while (true) {
            let replaced = false;
            for (let i = 0; i < tokens.length; i++) {
                let pattern = patterns.reduce((found, test) => found || test(tokens.slice(i)), false);
                if (pattern) {
                    replaced = true;
                    let slice = tokens.slice(i, i + pattern.length);
                    tokens.splice(i, slice.length, {
                        type: 'expression',
                        kind: pattern.kind,
                        expression: slice,
                        children: pattern.children,
                        original: slice.slice(),
                        run: (allTables, columns, rows, row) => pattern.run(allTables, columns, rows, row, slice),
                        toString: () => pattern.toString(),
                    });
                    i --;
                }
            }
            if (!replaced) {
                break;
            }
        }

        if (tokens.length === 1 && tokens[0].type === 'expression') {
            return tokens[0];
        }

        throw new Error('Malformed expression');
    }

    static buildBetween(walk, Select) {

    }

    // 
    static buildInPartial(walk, Select) {
        let int = walk.perhaps.lc('in');
        if (!int) {
            return;
        }

        let result = [int];

        let start = walk.must.lc('(');
        let inside = Pass.readInsides(tokens, '(', ')');
        walk.skip(inside.length);
        let end = walk.must.lc(')');

        let inwalk = walk.bind(inside, []);
        let query = Select.build(inwalk);
        if (query) {
            result.push(query);
        } else {
            result.push(start);
            while (!inwalk.empty) {
                let expression = Expression.build(inwalk, Select);
                if (!expression) {
                    Pass.expected('expression');
                }

                result.push(expression);

                if (!inwalk.perhaps.lc(',')) {
                    break;
                }
            }
            result.push(end);

            inwalk.empty || Pass.unexpected(inwalk.ahead[0].token);
        }

        return result;
    }

    static buildLikePartial(walk, Select) {
        
    }
};
