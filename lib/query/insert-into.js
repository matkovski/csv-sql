import Pass from './pass.js';

export default class InsertInto extends Pass {
    constructor(name, into) {
        super();
        this.name = name;
        this.into = into;
    }

    static build(walk) {
        walk.must.lc('into');

        let name = walk.must.type('identifier');
        let list = [];

        if (walk.perhaps.lc('(')) {
            while (true) {
                if (walk.perhaps.token(')')) {
                    break;
                }

                list.push(walk.must.type(t => t === 'identifier' || t === 'reserved'));

                if (!walk.perhaps.token(',')) {
                    break;
                }
            }

            walk.must.lc(')');
        }

        return new InsertInto(name, list);
    }
}