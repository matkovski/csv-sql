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

    static build(walk) {

        let result = {};
        while (true) {
            if (walk.perhaps.lc('distinct')) {
                result.distinctrow && Pass.unexpected('DISTINCT');
                result.distinct = true;
            } else if (walk.perhaps.lc('distinctrow')) {
                result.distinct && Pass.unexpected('DISTINCTROW');
                result.distinctrow = true;
            } else {
                let other = [
                    'high_priority',
                    'straight_join',
                    'sql_small_result',
                    'sql_big_result',
                    'sql_buffer_result',
                    'sql_no_cache',
                    'sql_calc_found_rows'
                ].find(tk => walk.perhaps.lc(tk));
                if (other) {
                    result[token.lc] = true;
                } else {
                    break;
                }
            }
        }

        return new SelectModifiers(result);
    }
}

