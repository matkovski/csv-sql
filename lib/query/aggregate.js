import cast from '../cast.js';

// TODO: distinct everywhere
// TODO: over clause

export function _singleArgument(args, allowDistinct = true, allowAsterisk = false) {
    if (args.length !== 1) {
        throw new Error('1 argument expected, ' + args.length + ' received');
    }

    if (args[0].type !== 'expression' && !(allowAsterisk && args[0].token === '*')) {
        throw new Error('Unexpected argument');
    }

    if (!allowDistinct && args[0].distinct) {
        throw new Error('Unexpected DISTINCT');
    }

}

export function avg(allTables, columns, rows, row, args) {
    _singleArgument(args, true);

    let length = rows.length;
    if (length) {
        let uniques = args[0] && args[0].distinct;
        let skip = [];
        let length = 0;
        let sum = rows.reduce((sum, rw) => {
            let value = cast(args[0].run(allTables, columns, rows, rw), 'number');
            if (value === null || uniques && skip.includes(value)) {
                return sum;
            } else {
                uniques && skip.push(value);
                length ++;
                return sum + value;
            }
        }, 0);
        return length ? sum / length : null;
    } else {
        return null;
    }
}

export function bit_and(allTables, columns, rows, row, args) {
    _singleArgument(args, false);

    if (rows.length) {
        let first = cast(args[0].run(allTables, columns, rows, rows[0]), 'number');
        return rows.slice(1).reduce((and, rw) => and & cast(args[0].run(allTables, columns, rows, rw), 'number'), first);
    }

    return null;
}

export function bit_or(allTables, columns, rows, row, args) {
    _singleArgument(args, false);

    if (rows.length) {
        let first = cast(args[0].run(allTables, columns, rows, rows[0]), 'number');
        return rows.slice(1).reduce((or, rw) => or | cast(args[0].run(allTables, columns, rows, rw), 'number'), first);
    }

    return null;
}

export function bit_xor(allTables, columns, rows, row, args) {
    _singleArgument(args, false);

    if (rows.length) {
        let first = cast(args[0].run(allTables, columns, rows, rows[0]), 'number');
        return rows.slice(1).reduce((xor, rw) => xor ^ cast(args[0].run(allTables, columns, rows, rw), 'number'), first);
    }

    return null;
}

export function count(allTables, columns, rows, row, args) {
    _singleArgument(args, true, true);

    if (args[0].lc === '*') {
        return rows.length;
    } else {
        let uniques = args[0].distinct;
        let skip = [];
        return rows.reduce((cnt, rw) => {
            let value = args[0].run(allTables, columns, rows, rw);
            if (value === null || uniques && skip.includes(value)) {
                return cnt;
            } else {
                uniques && skip.push(value);
                return cnt + 1;
            }
        }, 0);
    }
}

export function group_concat(allTables, columns, rows, row, args) {
}

export function json_arrayagg(allTables, columns, rows, row, args) {
}

export function json_objectagg(allTables, columns, rows, row, args) {
}

export function max(allTables, columns, rows, row, args) {
    _singleArgument(args, true);

    if (rows.length) {
        let uniques = args[0].distinct;
        let skip = [];
        return rows.reduce((mx, rw) => {
            let value = cast(args[0].run(allTables, columns, rows, rw), 'number');
            if (value === null || uniques && skip.includes(value)) {
                return mx;
            } else {
                uniques && skip.push(value);
                return Math.max(mx, value);
            }
        }, 0);
    }

    return null;
}

export function min(allTables, columns, rows, row, args) {
    _singleArgument(args);

    if (rows.length) {
        return Math.min(...rows.map(rw => cast(args[0].run(allTables, columns, rows, rw)), 'number'));
    }

    return null;
}

export function std(allTables, columns, rows, row, args) {
}

export function stddev(allTables, columns, rows, row, args) {
}

export function stddev_pop(allTables, columns, rows, row, args) {
}

export function stddev_samp(allTables, columns, rows, row, args) {
}

export function sum(allTables, columns, rows, row, args) {
    _singleArgument(args);

    if (rows.length) {
        let uniques = args[0] && args[0].distinct;
        let skip = [];
        return rows.reduce((sum, rw) => {
            let value = cast(args[0].run(allTables, columns, rows, rw), 'number');
            if (value === null || uniques && skip.includes(value)) {
                return sum;
            } else {
                uniques && skip.push(value);
                return sum + value;
            }
        }, 0);
    }

    return null;
}

export function var_pop(allTables, columns, rows, row, args) {
}

export function var_samp(allTables, columns, rows, row, args) {
}

export function variance(allTables, columns, rows, row, args) {
}

