import Query from './query.js';
import FileTable from './table/file.js';
import ArrayTable from './table/array.js';
import FileIO from './io/file.js';

export default class CsvDb {
    static array(...arrays) {
        let idx = 0;
        let db = Object.create(CsvDb.prototype);
        db._tables = arrays.reduce((all, array) => {
            let name = 't' + (++idx);
            all[name] = new ArrayTable(name, array, name);
            return all;
        }, {});
        db._openPromise = Promise.resolve();
        return db;
    }

    constructor(input1, input2, input3) {
        if (Array.isArray(input1)) {
            this._initFiles = input1;
            this._initHeaders = !!input2;
            this._initSeparator = input3;
        } else if (typeof input1 === 'string') {
            this._initFiles = [input1];
            this._initHeaders = !!input2;
            this._initSeparator = input3;
        } else if (typeof input1 === 'object') {
            let errors = this._validateSchema(input1);
            if (errors) {
                throw new Error('Initialisation error:\n' + errors.map(v => ' - ' + v + '\n').join(''));
            }

            this._schema = input1;
        }
    }

    open() {
        if (this._openPromise) {
            return this._openPromise;
        }

        // console.time('[open]');

        if (this._schema) {
            this._tables = Object.keys(this._schema).reduce((all, name) => {
                all[name] = new FileTable(name, this._schema[name], FileIO);
                return all;
            }, {});
        } else if (this._initFiles) {
            this._tables = this._initFiles.reduce((all, file, i) => {
                let name = 't' + (i + 1);
                let schema = {
                    file: file,
                    headers: this._initHeaders,
                    separator: this._initSeparator
                };
                all[name] = new FileTable(name, schema, FileIO);
                return all;
            }, {});
        } else {
            this._tables = {};
            return Promise.reject('No tables specified');
        }
        
        return this._openPromise = Promise.all(Object.keys(this._tables).map(name => this._tables[name].read())).then(res => {
            // console.timeEnd('[open]');
            return res;
        }).catch(why => {
            // console.timeEnd('[open]');
            throw new Error(why);
        });
    }

    async query(sql, params) {
        await this.open();
        // console.time('[parse]');
        let query = new Query(sql, params);
        // console.timeEnd('[parse]');
        // console.time('[evaluate]');
        let result = await query.run(this._tables);
        // console.timeEnd('[evaluate]');
        return result;
    }

    _validateSchema(schema) {
        // let errors = [];
        // Object.keys(schema).forEach(name => {
        //     if (!schema[name].file) {
        //         errors.push('No file defined for table "' + name + '"');
        //     }
        // });
    }
}
