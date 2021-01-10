import {cast, single} from '../cast.js';

function _if(allTables, columns, rows, row, args) {
    if (args.length < 1 || args.length > 3) {
        throw new Error('1..3 arguments expected');
    }

    let condition = cast(single(args[0].run(allTables, columns, rows, row)), 'bool');
    if (condition) {
        return args[1] ? single(args[1].run(allTables, columns, rows, row)) : true;
    } else {
        return args[2] ? single(args[2].run(allTables, columns, rows, row)) : true;
    }
};

function concat(allTables, columns, rows, row, args) {
    if (args.length < 1) {
        throw new Error('Arguments expected');
    }

    return args.reduce((concat, a) => {
        if (concat === null) {
            return null;
        }
        let value = single(a.run(allTables, columns, rows, row));
        if (value === null) {
            return null;
        }
        return concat + ('' + value);
    }, '');
}

export let functions = {
    'if': _if,
    concat,
};

export default functions;
