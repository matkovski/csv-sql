export default class Pass {
    static unexpected(what) {
        throw new Error('Unexpected: ' + what);
    }

    static expected(what, found = undefined) {
        throw new Error('Expected : ' + what + (found ? '\nFound    : ' + found : ''));
    }

    static unterminated(what) {
        throw new Error('Unterminated expression');
    }

    static malformed(what = undefined) {
        throw new Error('Malformed expression' + (what ? ': ' + what : ''));
    }

    static readInsides(tokens, start, end) {
        if (!tokens[0] && tokens[0].token !== start) {
            Pass.expected(start);
        }
        let c = 1;
        let inside = [];
        for (let i = 1; i < tokens.length; i++) {
            if (tokens[i].token === start) {
                c++;
            } else if (tokens[i].token === end) {
                c--;
                if (c === 0) {
                    break;
                }
            }
            inside.push(tokens[i]);
        }
        c && Pass.unterminated(start);
        return inside;
    }
};
