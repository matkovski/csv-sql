import csv from '../csv.js';
import Table from './table.js';

export default class FileTable extends Table {
    constructor(name, schema, IO, alias) {
        super(name, [], [], alias);
        this._schema = schema;
        this._io = new IO(this._schema.file);
    }

    insert(rows) {
        // TODO: check unique fields, don't just push
        this._data.rows.push(...rows);
        this._data.height += rows.length;
        this.write();
        return rows.length;
    }

    read() {
        return this._io.read().then(data => {
            this._data = csv.parse(data, this._schema.separator);

            if (Array.isArray(this._schema.columns)) {
                let idx = 1;
                this._schema.columns.forEach(column => {
                    let name = column.name || 'c' + (idx++);
                    let type = column.type || 'varchar(255)';
                    this._names.push(name);
                    this._types.push(type);
                    this._typesMap[name] = type;
                });

                if (this._schema.headers) {
                    this._data.rows.shift();
                    this._data.height --;
                }
            } else {
                let idx = 1;
                let headers;
                if (this._schema.headers) {
                    headers = this._data.rows.shift();
                    this._data.height --;
                } else {
                    headers = new Array(this._data.width).fill(undefined);
                }
                headers.forEach(name => {
                    name = (name || 'c' + (idx ++)).replace(' ', '_');
                    let type = 'varchar(255)';
                    this._names.push(name);
                    this._types.push(type);
                    this._typesMap[name] = type;
                });
            }
        });
    }

    write() {
        let string = csv.stringify(this._data.rows, this._schema.separator, this._schema.headers ? this._names : undefined);
        return this._io.write(string);
    }

    as(alias) {
        let clone = new FileTable(this._name, this._schema, this._io.constructor, alias);
        clone._io = this._io;
        clone._names = this._names;
        clone._types = this._types;
        clone._typesMap = this._typesMap;
        clone._data = this._data
        return clone;
    }
}
