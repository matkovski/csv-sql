import fs from 'fs';

export default class FileIO {
    constructor(source) {
        this.source = source;
    }
    
    read() {
        return new Promise((resolve, reject) => {
            if (fs.existsSync(this.source)) {
                fs.readFile(this.source, 'utf8', (err, file) => {
                    if (err) {
                        reject('Could not open file ' + this.source);
                    } else {
                        resolve(file);
                    }
                });
            } else {
                reject('Could not find file ' + this.source);
            }
        });
    }

    write(data) {
        return new Promise((resolve, reject) => {
            fs.writeFile(this.source, data, 'utf8', err => {
                if (error) {
                    reject('Could not write to file ' + this.source);
                } else {
                    resolve();
                }
            });
        })
    }
}
