import Table from './table.js';

export default class TempTable extends Table {
    constructor(name, names, types, data, alias) {
        super(name, names, types, alias);
        this._data = { rows: data, height: data.length, width: data.reduce((max, row) => Math.max(max, row.length), 0) };
    }

    static from(table, data) {
        return new TempTable(table.name, table.names, table.types, data);
    }

    as(alias) {
        let clone = new FileTable(this._name, this._schema, this._io.constructor, alias);
        clone._names = this._names;
        clone._types = this._types;
        clone._typesMap = this._typesMap;
        clone._data = JSON.parse(JSON.stringify(this._data));
        return clone;
    }
}
