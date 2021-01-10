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

    static build(walk, Select) {
        let result = [];

        if (walk.perhaps.lc('order')) {
            walk.must.lc('by');
            while (!walk.empty) {
                let def = { expression: Expression.build(walk, Select) };
                def.expression || Pass.malformed();

                if (walk.perhaps.lc('desc')) {
                    def.order = -1;
                } else {
                    walk.perhaps.lc('asc')
                    def.order = 1;
                }

                result.push(def);

                if (!walk.perhaps.lc(',')) {
                    break;
                }
            }
        }

        return new SelectOrderBy(result);
    }
}