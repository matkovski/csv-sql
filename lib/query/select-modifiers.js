import Pass from './pass.js';

export default class SelectModifiers extends Pass {
    constructor(modifiers) {
        super();
        
        this.modifiers = modifiers;
    }

    run(tables, rows) {
        if (this.modifiers.distinct) {
            let already = {};
            return rows.filter(row => {
                let tail = already;
                return row.some((value, i) => {
                    if (i === row.length - 1) {
                        let good = !(value in tail);
                        tail[value] = true;
                        return good;
                    } else {
                        if (!(value in tail)) {
                            tail[value] = {};
                        }
                        tail = tail[value];
                        return false;
                    }
                });
            });
        }

        return rows;
    }

    static build(tokens, eaten) {
        tokens.length || Pass.unterminated();

        let result = {};
        while (true) {
            let token = tokens[0];
            if (token.lc === 'all') {
                (result.distinct || result.distinctrow) && Pass.unexpected(tokens[0].token);

                eaten.push(tokens.shift());
                result.all = true;
            } else if (token.lc === 'distinct') {
                (result.all || result.distinctrow) && Pass.unexpected(tokens[0].token);
                eaten.push(tokens.shift());
                result.distinct = true;
            } else if (token.lc === 'distinctrow') {
                (result.all || result.distinct) && Pass.unexpected(tokens[0].token);
                eaten.push(tokens.shift());
                result.distinctrow = true;
            } else if (['high_priority', 'straight_join', 'sql_small_result', 'sql_big_result', 'sql_buffer_result', 'sql_no_cache', 'sql_calc_found_rows'].includes(token.lc)) {
                eaten.push(tokens.shift());
                result[token.lc] = true;
            } else {
                break;
            }
        }

        return new SelectModifiers(result);
    }
}

