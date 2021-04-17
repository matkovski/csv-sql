import {stat, readFile, writeFile} from 'fs/promises';

export default class FileIO {
    constructor(source) {
        this.source = source;
    }
    
    async read() {
        if (await stat(this.source)) {
            try {
                let ret = await readFile(this.source, 'utf8');
                return ret;
            } catch(err) {
                throw new Error('Could not open file ' + this.source + ' (' + err.message + ')');
            }
        } else {
            throw new Error('Could not find file ' + this.source);
        }
    }

    async write(data) {
        data = data.join('\n');
        try {
            await writeFile(this.source, data, 'utf8');
        } catch (err) {
            throw new Error('Could not write to file ' + this.source);
        }
    }
}
