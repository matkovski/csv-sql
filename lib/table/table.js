export default class Table {
    constructor(name, names, types, alias) {
        this._name = name;
        this._names = names && names.slice() || [];
        this._types = types && types.slice() || [];
        this._typesMap = this._names.reduce((all, n, i) => (all[n] = this.types[i], all), {});
        this._data = { rows: [], height: 0, width: 0 };
        this._alias = alias || '';
    }

    get name() {
        return this._name;
    }

    get names() {
        return this._names.slice();
    }

    get types() {
        return this._types.slice();
    }

    get width() {
        return this._data.width;
    }

    get height() {
        return this._data.height;
    }

    get rows() {
        return this._data.rows;
    }

    insert(rows) {
        
    }
}
