import Pass from './pass.js';
import Expression from './expression.js';

export default class SelectOrderBy extends Pass {
    constructor(orders) {
        super();

        this.orders = orders;
    }

    run(tables, columns, selected, rows) {
        if (!this.orders || !this.orders.length) {
            return rows;
        }

        return rows.slice().reverse().sort((a, b) => {
            let asorts = [];
            let bsorts = [];
            this.orders.forEach(or => {
                if (or.index) {
                    let index = or.index - 1;
                    // TODO: sort by 1: must work
                    if (selected[index] && selected[index].run) {
                        asorts.push(selected[index].run(tables, columns, rows, a));
                        bsorts.push(selected[index].run(tables, columns, rows, b));
                    } else {
                        throw new Error('Cannot sort by index ' + or.index);
                    }
                } else {
                    asorts.push(or.expression.run(tables, columns, rows, a));
                    bsorts.push(or.expression.run(tables, columns, rows, b));
                }
            });

            return asorts.reduce((value, a, i) => {
                let b = bsorts[i];
                let dir = this.orders[i].order;
                return value ? value : (a > b ? 1 : (a < b ? -1 : 0)) * dir;
            }, 0);
        });
    }

    static build(tokens, eaten, Select) {
        let result = [];

        if (tokens[0] && tokens[0].lc === 'order') {
            if (tokens[1] && tokens[1].lc === 'by') {
                eaten.push(...tokens.splice(0, 2));
                
                while (tokens.length) {
                    let def = { };
                    if (tokens[0].type === 'number') {
                        def.index = + tokens[0].token;
                        eaten.push(tokens.shift());
                    } else {
                        let expression = Expression.build(tokens, eaten, Select);
                        if (!expression) {
                            Pass.malformed();
                        }
                        def.expression = expression;
                    }

                    if (tokens[0] && tokens[0].lc === 'desc') {
                        def.order = -1;
                        eaten.push(tokens.shift());
                    } else {
                        def.order = 1;
                        if (tokens[0] && tokens[0].lc === 'asc') {
                            eaten.push(tokens.shift());
                        }
                    }

                    result.push(def);

                    if (tokens[0] && tokens[0].token === ',') {
                        eaten.push(tokens.shift());
                        continue;
                    }

                    break;
                }
            } else {
                tokens[1] ? Pass.unexpected(tokens[1].token) : Pass.expected('BY');
            }
        }

        return new SelectOrderBy(result);
    }
}