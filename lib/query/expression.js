import Pass from './pass.js';
import cast from '../cast.js';
import aggregates from './aggregate.js';
import functions from './functions.js';

let priority = ['or', 'and', 'in', '<', '>', '<=', '>=', 'like', '<>', '=', '+', '-', '/', '*'];

let patterns = [
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
                toString: () => token.substr(1, token.length - 2),
            }))(ts[0].token)
        }
    },

    // number
    ts => {
        if (ts[0].type === 'number') {
            return (token => ({
                kind: 'number',
                run: () => + token,
                length: 1,
                toString: () => token,
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
    let values = args.map(arg => arg.run(allTables, columns, rows, row));
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
        return values.reduce((all, val) => all * val, 1);
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

    static build(tokens, eaten, Select) {
        return Expression.buildTree(tokens, eaten, Select, false);
        // return new Expression(tree);
    }

    static buildTree(tokens, eaten, Select, canBeSelect = false) {
        if (canBeSelect) {
            try {
                let startat = eaten.length;
                let select = Select.build(tokens, eaten);
                if (select) {
                    let original = eaten.slice(startat);
                    return {
                        type: 'expression',
                        kind: 'query',
                        original: original,
                        query: select,
                        run: (allTables, columns, rows, row) => select.run(allTables),
                        toString: () => select.toString(),
                    };
                }
            } catch(e) {}
        }

        let result = [];
        while (tokens[0] && tokens[0].token !==',' && (aggregates[tokens[0].lc] || functions[tokens[0].lc] || tokens[0].type !== 'reserved' || ['distinct', 'in', 'and', 'or'].includes(tokens[0].lc))) {
            if (tokens[0].token === '(') {
                let c = 1;
                let inside = [];
                for (let i = 1; i < tokens.length; i ++) {
                    if (tokens[i].token === '(') {
                        c ++;
                    } else if (tokens[i].token === ')') {
                        c --;
                        if (c === 0) {
                            break;
                        }
                    }
                    inside.push(tokens[i]);
                }
                if (c === 0) {
                    let looksLikeFunctionCall = ['reserved', 'identifier'].includes(result[result.length - 1].type);
                    let argsLength = inside.length;
                    if (argsLength) {
                        if (result.length && looksLikeFunctionCall) {
                            // an exception for expressions like count(*)
                            if (inside.length === 1 && inside[0].token === '*') {
                                let func = result.pop();
                                result.push(Expression.plainExpression([func, ...tokens.slice(0, argsLength + 2)], [], Select, false));
                            } else {
                                // an exception for DISTINCT - it's the only thing that can legally appear here
                                let expression;
                                if (inside[0].lc === 'distinct') {
                                    expression = Expression.buildTree(inside.slice(1), [], Select, true);
                                    expression.distinct = true;
                                    result.push(tokens[0], expression, tokens[argsLength + 1]);
                                } else {
                                    let args = [];
                                    while (inside.length) {
                                        let expression = Expression.buildTree(inside, [], Select, true);
                                        if (expression) {
                                            args.push(expression);
                                            if (inside[0] && inside[0].token === ',') {
                                                args.push(inside.shift());
                                            }
                                        } else {
                                            Pass.expected('expression');
                                        }
                                    }
                                    result.push(tokens[0], ...args, tokens[argsLength + 1]);
                                }
                                // result.push(tokens[0], ...inside, tokens[argsLength + 1]);
                            }
                        } else {
                            result.push(Expression.buildTree(inside, [], Select, true));
                        }
                        eaten.push(...tokens.splice(0, argsLength + 2));
                    } else if (looksLikeFunctionCall) {
                        result.push(tokens.slice(0, 3));
                        eaten.push(...tokens.splice(0, 3));
                    } else {
                        Pass.unexpected(')');
                    }
                } else {
                    Pass.unterminated('(');
                }
                // let subtree = buildTree
            } else {
                result.push(tokens[0]);
                eaten.push(tokens.shift());
            }
        }

        return Expression.breakDown(result, priority.slice(), Select);
    }

    static breakDown(tokens, ops, Select) {
        if (tokens.length === 1) {
            return Expression.plainExpression(tokens, Select);
        }

        if (ops.length) {
            let op;
            do {
                op = ops.shift();
            } while (op && !tokens.some(t => t.lc === op));
            if (!op) {
                return Expression.plainExpression(tokens, Select);
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
            return Expression.plainExpression(tokens, Select);
        }
    }

    static plainExpression(tokens, Select) {
        let sliced = 0;

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
                    sliced += slice.length - 1;
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
};