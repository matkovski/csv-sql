import Table from './table.js';

export default class ArrayTable extends Table {
    constructor(name, array, alias) {
        super(name, [], [], alias);
        
        this._schema = {
            file: undefined,
            headers: false,
            separator: ','
        };

        if (!Array.isArray(array)) {
            throw new Error('Invalid array data');
        }

        let width = Math.max(0, ...array.map(row => row.length));
        let row = new Array(width).fill(0);

        this._names = row.map((v, i) => 'c' + (i + 1));
        this._types = row.map((v, i) => 'varchar(255)');
        this._typesMap = this._names.reduce((a, n) => (a[n] = 'varchar(255)', a), {});

        this._data = {
            rows: array,
            height: array.length,
            width: width,
        };
    }

    read() {
        return Promise.resolve();
    }

    write() {
        return Promise.resolve();
    }

    as(alias) {
        let clone = new ArrayTable(this._name, this._data.rows, alias);
        clone._io = this._io;
        clone._names = this._names;
        clone._types = this._types;
        clone._typesMap = this._typesMap;
        clone._data = this._data;
        return clone;
    }
}
