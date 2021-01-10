import Pass from './query/pass.js';

function pick(target, thrw, ahead, behind, not, what, peek) {
    not = !!not;
    let yes = !!ahead[0];
    let count = 0;
    if (yes) {
        if (typeof what === 'function') {
            yes = what(ahead[0][target]);
            count = 1;
        } else if (Array.isArray(what)) {
            yes = what.every((w, i) => ahead[i] && ahead[i][target] === w);
            count = what.length;
        } else {
            yes = ahead[0][target] === what;
            count = 1;
        }
    }
    if (yes !== not) {
        if (peek) {
            return ahead[0];
        } else {
            let tokens = ahead.splice(0, count);
            behind.push(...tokens);
            return tokens.pop();
        }
    } else {
        thrw && Pass.expected(what, ahead.map(token => token.token).join(' '));
    }
}

function build(ahead, behind) {
    return {
        ahead,
        behind,
        get empty() { return !ahead.length },
        get walked() { return behind.length },
        perhaps: {
            type: pick.bind(undefined, 'type', false, ahead, behind, false),
            token: pick.bind(undefined, 'token', false, ahead, behind, false),
            lc: pick.bind(undefined, 'lc', false, ahead, behind, false),
            not: {
                type: pick.bind(undefined, 'type', false, ahead, behind, true),
                token: pick.bind(undefined, 'token', false, ahead, behind, true),
                lc: pick.bind(undefined, 'lc', false, ahead, behind, true),
            }
        },
        must: {
            type: pick.bind(undefined, 'type', true, ahead, behind, false),
            token: pick.bind(undefined, 'token', true, ahead, behind, false),
            lc: pick.bind(undefined, 'lc', true, ahead, behind, false),
            not: {
                type: pick.bind(undefined, 'type', true, ahead, behind, true),
                token: pick.bind(undefined, 'token', true, ahead, behind, true),
                lc: pick.bind(undefined, 'lc', true, ahead, behind, true),
            }
        },
        skip(steps) {
            let skip = ahead.splice(0, steps);
            behind.push(...skip);
            return skip;
        },
        restart() {
            return build(ahead.slice(), []);
        },
        bind(a, b) {
            return build(a, b);
        }
    }
}

export default build([], []);
