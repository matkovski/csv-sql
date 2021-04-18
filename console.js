import DB from './index.js';
import repl from 'repl';

let db = new DB({ t: 'data/one.csv' }, true, ',');

let buffer = '';
function myEval(line, context, filename, callback) {
    if (line.trim().endsWith(';')) {
        line = buffer + line;
        buffer = '';
        line = line.replace(/\s+$/, '');
        line = line.replace(/;$/, '');
        db.query(line).then(render.bind(undefined, callback)).catch(error).finally(() => process.stdout.write('> '));
    } else {
        buffer += line;
        // process.stdout.write('> ');
    }
    // console.log(cmd, context, filename, callback);
}

repl.start({ prompt: '> ', eval: myEval });


function render(callback, result) {
    let longest = result.columns.map(c => c.length);
    result.rows.forEach(row => row.forEach((v, i) => longest[i] = Math.max(longest[i], ('' + v).length)));

    let line = longest.reduce((all, length) => all + ''.padStart(length + 2, '-') + '+', '+');

    let text = line + '\n';
    text = result.columns.reduce((all, name, i) => all + ' ' + name.padEnd(longest[i] + 1, ' ') + '|', text + '|') + '\n';
    text += line + '\n';
    result.rows.forEach(row => {
        text = row.reduce((all, value, i) => all + ' ' + ('' + value).padEnd(longest[i] + 1, ' ') + '|', text + '|') + '\n';
    });
    text += line + '\n';

    // callback(null, text);
    console.log(text);
}

function error(msg) {
    // console.log('ERROR:', msg.message);
    console.log('ERROR:', msg.message, '\n', msg.stack);
}
