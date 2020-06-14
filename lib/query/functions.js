import cast from '../cast.js';

function _if(allTables, columns, rows, row, args) {
    if (args.length < 1 || args.length > 3) {
        throw new Error('1..3 arguments expected');
    }

    let condition = cast(args[0].run(allTables, columns, rows, row), 'bool');
    if (condition) {
        return args[1] ? args[1].run(allTables, columns, rows, row) : true;
    } else {
        return args[2] ? args[2].run(allTables, columns, rows, row) : true;
    }
};

export let functions = {
    'if': _if
};

export default functions;
