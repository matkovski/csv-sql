import Pass from './pass.js';
import * as aggregate from './aggregate.js';

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

        return this.from.reduce((all, def) => {
            if (!tables[def.table]) {
                throw new Error('Unknown table ' + def.table);
            }

            all.push(tables[def.table].as(def.alias));
            // all.push(Object.assign({ alias: def.alias }, tables[def.table]));
            return all;
        }, []);
    }

    static build(tokens, eaten) {
        let result = [];

        if (!tokens[0]) {
            return;
        } else if (tokens[0].lc !== 'from') {
            Pass.unexpected(tokens[0].token);
        }

        eaten.push(tokens.shift());

        // TODO: support joins
        // TODO: support subqueries here
        while (tokens.length) {
            let token = tokens[0];
            if (token && token.type === 'identifier') {
                let def = { type: 'table', table: token.token };
                eaten.push(tokens.shift());

                if (tokens[0] && tokens[0].lc === 'as') {
                    if (tokens[1] && tokens[1].type === 'identifier') {
                        def.alias = tokens[1].token;
                        eaten.push(tokens.shift());
                        eaten.push(tokens.shift());
                    } else {
                        tokens[1] ? Pass.unexpected(tokens[1].token) : Pass.unterminated();
                    }
                } else if (tokens[0] && (tokens[0].type === 'identifier' || tokens[0].type === 'reserved' && tokens[0].type in aggregate)) {
                    def.alias = tokens[0].token;
                    eaten.push(tokens.shift());
                }

                result.push(def);
            } else {
                Pass.unexpected(token.token);
                break;
            }

            if (tokens[0] && tokens[0].token === ',') {
                eaten.push(tokens.shift());
            } else {
                break;
            }
        }

        return new SelectFrom(result);
    }
}
