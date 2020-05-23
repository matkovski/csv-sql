export default class Pass {
    static unexpected(what) {
        throw new Error('Unexpected: ' + what);
    }

    static expected(what) {
        throw new Error('Expected: ' + what);
    }

    static unterminated(what) {
        throw new Error('Unterminated expression');
    }

    static malformed(what = undefined) {
        throw new Error('Malformed expression' + (what ? ': ' + what : ''));
    }
};