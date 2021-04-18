export default class Table {
    constructor(name, names, types, alias, rows = undefined) {
        this.name_ = name;
        this.names_ = names && names.slice() || [];
        this.types_ = types && types.slice() || [];
        this.typesMap_ = this.names_.reduce((all, n, i) => (all[n] = this.types[i], all), {});
        this.data_ = {
            rows: rows || [],
            height: rows && rows.length || 0,
            width: this.names_.length || 0
        };
        this.alias_ = alias || '';
    }

    get name() {
        return this.name_;
    }

    get names() {
        return this.names_.slice();
    }

    get types() {
        return this.types_.slice();
    }

    get width() {
        return this.data_.width;
    }

    get height() {
        return this.data_.height;
    }

    get rows() {
        return this.data_.rows;
    }

    insert(rows) {
        
    }
}
