import Query from './query.js';
import Table from './table/table.js';
import csv from './csv.js';

/*
new Db({
    one: 'file1.csv',
    two: 'file2.json',
    three: 'plaintext csv',
    four: 'plantext json',
    five: [[1, 'John'], [2: 'Michael']],
    six: [{id: 1, name: 'John'}, {id: 2, name: 'Michael'}],
    seven: {
        file: './data/one.csv',
        headers?: true,
        separator?: ',',
        columns?: [
            { name: 'id', type: 'int' },
            { name: 'name', type: 'varchar(255)' }
        ]
    }
}, true, ';');
*/

let browser = typeof window !== 'undefined';
let node = !browser;

export default class CsvDb {
    constructor(source, headers = false, separator = ';') {
        if (typeof source !== 'object') {
            throw new Error('Invalid configuration: a database description is required');
        }

        let promises = [];

        this.tables_ = {};
        
        for (let name in source) {
            let def = source[name];
            if (typeof def === 'string') {
                promises.push(this.getTableFromString(name, def, headers, separator).then(t => this.tables_[name] = t));
            } else if (Array.isArray(def)) {
                this.tables_[name] = this.getTableFromArray(name, def, headers);
            } else if (typeof def === 'object' && def) {
                promises.push(this.getTableFromSchema(name, def, headers, separator).then(t => this.tables_[name] = t));
            } else {
                throw new Error('Invalid configuration for table ' + name);
            }
        }

        this.open = Promise.all(promises);
    }

    async getTableFromString(name, string, headers, separator, columns = undefined) {
        let lines = string.split('\n');
        let content;
        if (lines.length === 1) {
            let file = lines[0];
            if (file.startsWith('http://') || file.startsWith('https://')) {
                content = await this.loadUrl(file);
            } else if (!file.includes(separator)) {
                content = await this.loadFile(file);
            } else {
                content = file;
            }
        } else {
            content = string;
        }

        let { rows, names, types } = this.parseJsonOrCsv(content, headers, separator, columns);

        return new Table(name, names, types, undefined, rows);
    }

    getTableFromArray(name, def, headers) {
        let objects = true;
        let arrays = true;
        def.every(entry => {
            if (!def) {
                return objects = arrays = false;
            }
            arrays = arrays && Array.isArray(entry);
            objects = objects && !arrays && typeof entry === 'object';
            return arrays || objects;
        });

        if (!objects && !arrays) {
            throw new Error('Unexpected data, make sure all entries are either arrays or objects');
        }

        let names;
        let idxs;
        let rows;

        if (objects) {
            names = def.reduce((all, entry) => {
                Object.keys(entry).forEach(key => all.includes(key) || all.push(key));
                return all;
            }, []);
            idxs = names.reduce((all, name, i) => (all[name] = i, all), {});
            rows = def.reduce((all, entry) => {
                let row = new Array(names.length).fill(null);
                Object.keys(entry).forEach(key => row[idxs[key]] = entry[key]);
                all.push(row);
                return all;
            }, []);
        } else {
            let width;
            if (headers) {
                names = def.shift();
                width = names.length;
            } else {
                width = def.reduce((max, entry) => Math.max(max, entry.length), 0);
                names = new Array(width).fill(0).map((v, i) => 'c' + (i + 1));
            }
            rows = def.map(entry => {
                if (entry.length > width) {
                    return entry.slice(0, width);
                } else if (entry.length < width) {
                    return new Array(width).fill(0).map((v, i) => entry[i] === undefined ? null : entry[i]);
                } else {
                    return entry.slice();
                }
            });
        }

        let types = names.map(() => 'varchar(255)');

        return new Table(name, names, types, undefined, rows);
    }

    async getTableFromSchema(name, def, headers = undefined, separator = undefined) {
        if (!def.file && !def.url) {
            throw new Error('Filename is required for schema');
        }

        headers = def.headers === undefined ? headers : def.headers;
        separator = def.separator === undefined ? separator : def.separator;
        return await this.getTableFromString(name, def.file || def.url, headers, separator, def.columns);
    }

    async loadFile(file) {
        if (node) {
            let fs = await import('fs/promises');
            return await fs.readFile(file, { encoding: 'utf-8' });
        } else {
            throw new Error('Cannot load local files in browser mode');
        }
    }

    async loadUrl(url) {
        if (node) {
            let http = await import(url.startsWith('https://') ? 'https' : 'http');
            return new Promise((resolve, reject) => {
                http.get(url, rs => {
                    if (rs.statusCode !== 200) {
                        res.resume();
                        reject('Could not load ' + url);
                        return;
                    }

                    let content = '';
                    rs.setEncoding('utf8');
                    rs.on('data', chunk => content += chunk);
                    rs.on('end', () => resolve(content));
                });
            });
        } else {
            return await (await fetch(url)).text();
        }
    }

    parseJsonOrCsv(string, headers, separator, columns = undefined) {
        let names = [];
        let types = [];
        let rows = [];
        let idxs = {};

        try {
            let json = JSON.parse(string);
            if (!Array.isArray(json)) {
                throw new Error('Source JSON must be an array of objects');
            }

            names = json.reduce((all, entry) => {
                if (typeof entry !== 'object' || !entry) {
                    throw new Error('Source JSON must be an array of objects');
                }
                Object.keys(entry).forEach(key => all.includes(key) || all.push(key));
                return all;
            }, []);
            idxs = names.reduce((all, name, i) => (all[name] = i, all), {});
            rows = json.reduce((all, entry) => {
                let row = new Array(names.length).fill(null);
                Object.keys(entry).forEach(key => row[idxs[key]] = entry[key]);
                all.push(row);
                return all;
            }, []);
        } catch (e) {
            let data = csv.parse(string, separator);
            rows = data.rows;
            names = headers ? rows.shift() : columns || new Array(data.width).fill(0).map((v, i) => 'c' + (i + 1));
        }

        // TODO: proper detection of types
        types = names.map(() => 'varchar(255)');

        return { names, types, rows };
    }

    async query(sql, params) {
        await this.open;
        // console.time('[parse]');
        let query = new Query(sql, params);
        // console.timeEnd('[parse]');
        // console.time('[evaluate]');
        let result = await query.run(this.tables_);
        // console.timeEnd('[evaluate]');
        return result;
    }

}
