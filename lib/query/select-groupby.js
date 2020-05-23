import Pass from './pass.js';
import Expression from './expression.js';

export default class SelectGroupBy {
    constructor(group) {
        this.group = group;
    }

    run(tables, columns, rows) {
        if (!this.group.length) {
            return rows;
        }
    }

    static build(tokens, eaten, Select) {
        let result = [];
        if (tokens[0] && tokens[0].lc === 'group') {
            if (tokens[1] && tokens[1].lc === 'by') {
                eaten.push(...tokens.splice(0, 2));

                if (!tokens.length) {
                    Pass.expected('identifier');
                }

                while (tokens.length) {
                    let expression = Expression.build(tokens, eaten, Select);
                    if (!expression) {
                        Pass.unexpected(tokens[0]);
                    }

                    result.push(expression);

                    if (tokens[0] && tokens[0].token === ',') {
                        eaten.push(tokens.shift());
                    } else {
                        break;
                    }
                }
            } else {
                tokens[1] ? Pass.unexpected(tokens[1].token) : Pass.expected('BY');
            }
        }

        return new SelectGroupBy(result);
    }
}
