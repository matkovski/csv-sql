import Query from './lib/query.js';
import Table from './lib/table.js';
import FileIO from './lib/io/file.js';


export default class CsvDb {
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

        console.time('[open]');

        if (this._schema) {
            this._tables = Object.keys(this._schema).reduce((all, name) => {
                all[name] = new Table(name, this._schema[name], FileIO);
                return all;
            }, {});
        } else if (this._initFiles) {
            this._tables = this._initFiles.reduce((all, file, i) => {
                let name = 't' + (i + 1);
                schema = {
                    file: file,
                    headers: this._initHeaders,
                    separator: this._initSeparator
                };
                all[name] = new Table(name, schema, FileIO);
                return all;
            });
        } else {
            this._tables = {};
            return Promise.reject('No tables specified');
        }
        
        return Promise.all(Object.keys(this._tables).map(name => this._tables[name].read())).then(res => {
            console.timeEnd('[open]');
            return res;
        });
    }

    query(sql, params) {
        return this.open().then(() => {
            console.time('[parse]');
            let query = new Query(sql);
            console.timeEnd('[parse]');
            console.time('[evaluate]');
            let result = query.run(this._tables);
            console.timeEnd('[evaluate]');
            return result;
        });
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
