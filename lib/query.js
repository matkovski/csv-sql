import Select from './query/select.js';
import Show from './query/show.js';
import {symbols, reserved} from './constants.js';

export default class Query {
    constructor(sql) {
        this.sql = (sql || '').trim();
        this.tree = this.parse();
    }

    parse() {
        let tokens = this.tokenize(this.sql);

        let query = Select.build(tokens, []);
        query = query || Show.build(tokens, []);

        if (tokens.length) {
            throw new Error('unexpected "' + tokens[0].token + '"');
        }

        return query;
        // return Select.build(tokens, []);
    }

    run(tables) {
        return this.tree.run(tables);
    }

    type(value) {
        if (value.startsWith('"') && value.endsWith('"') || value.startsWith("'") && value.endsWith("'")) {
            return 'string';
        } else if (value.match(/^\d+$/) || value.match(/^\d*\.\d+$/)) {
            // TODO: a better number detection
            return 'number';
        } else if (symbols.includes(value)) {
            return 'symbol';
        } else if (value.match(/^\w[\w\d_]*$/)) {
            return reserved.includes(value.toLowerCase()) ? 'reserved' : 'identifier';
        }
    }

    tokenize(str) {
        let len = str.length;
        let tokens = [];
        let token = '';

        let push = t => {
            (t === undefined) && (t = token);
            t && tokens.push({
                token: t,
                lc: t.toLowerCase(),
                type: this.type(t),
            });
            token = '';
        };

        for (let i = 0; i < len; i++) {
            let c = str[i];
            if (symbols.includes(c)) {
                push();
                push(c);
            } else if (c === ';') {
                throw new Error('Multiple expressions are not supported');
            } else if (c === "'" || c === '"') {
                push();
                token = c;

                let end = c;
                let proper = false;
                for (++i; i < len; i++) {
                    c = str[i];
                    if (c === '\\') {
                        token += JSON.parse('"' + c + str[i + 1] + '"');
                        i++;
                    } else if (c === end) {
                        token += c;
                        proper = true;
                        break;
                    } else {
                        token += c;
                    }
                }
                if (proper) {
                    push();
                } else {
                    throw new Error('Unterminated string');
                }
            } else if (c === ' ' || c === '\n' || c === '\r' || c === '\t') {
                push()
            } else {
                token += c;
            }
        }
        push();

        // collapse multicharacter symbols, like >= or <>
        let longest = symbols.reduce((l, s) => s.length > l.length ? s : l).length;
        if (longest > 1) {
            for (let i = 0; i < tokens.length; i ++) {
                if (tokens[i].type === 'symbol') {
                    for (let j = longest; j > 0; j --) {
                        let join = tokens.slice(i, i + j).map(t => t.token).join('');
                        if (symbols.includes(join)) {
                            tokens.splice(i, j, { token: join, type: 'symbol', lc: join.toLowerCase() });
                            break;
                        }
                    }
                }
            }
        }

        return tokens;
    }
}
