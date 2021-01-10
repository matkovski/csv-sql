import cast from './cast.js';

function parse(data, separator, types) {
    separator = separator || '\t';

    if (!data) {
        return {
            rows: [],
            height: 0,
            width: 0,
        }
    }

    let rows = [];
    let len = data.length;
    let width = 0;
    let value = '';
    let row = [];

    let pushValue = () => {
        let index = row.length;
        let type = types && types[index];
        row.push(cast(value, type));
        value = '';
    };

    let pushRow = () => {
        if (width < row.length) {
            width = row.length;
        }
        rows.push(row);
        row = [];
    };

    for (let i = 0; i < len; i++) {
        let c = data[i];
        if (c === '"') {
            if (value) {
                if (data[i + 1] === '"') {
                    // it's a pair of "" inside a value not enclosed in "", bad in itself but ok
                    value += c;
                    i++;
                } else {
                    // it's a single quote mark inside a value - invalid syntax
                    throw new Error('Unreadable CSV data (unexpected quote mark)');
                }
            } else {
                for (++i; i < len; i++) {
                    c = data[i];
                    if (c === '"' && data[i + 1] !== '"') {
                        // pushValue(value);
                        break;
                    }
                    value += c;
                }
            }
        } else if (c === '\n') {
            value && pushValue();
            pushRow();
        } else if (c === '\r') {
            // ignore
        } else if (c === separator) {
            pushValue(value);
        } else if (!value && c.charCodeAt(0) === 0xfeff) {
            // ignore
        } else {
            value += c;
        }
    }

    value && pushValue();
    row.length && pushRow();

    return {
        rows: rows,
        height: rows.length,
        width: width,
    }
}

function stringify(data, separator, names = undefined) {
    separator = separator || '\t';

    let headers = names && names.map(name => name || '').join(separator);

    return data.reduce((all, row) => {
        all.push(row.map(value => value === null ? 'NULL' : ('' + value)).join(separator));
        return all;
    }, [headers]);
}

export let csv = {
    parse: parse,
    stringify: stringify
}

export default csv;