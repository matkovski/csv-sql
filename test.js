import DB from './index.js';

let db = new DB({
    one: {
        file: './test/one.csv',
        headers: true,
        separator: ',',
        columns: [
            { name: 'id', type: 'int' },
            { name: 'name', type: 'varchar(255)' }
        ]
    },
    two: {
        file: './test/two.csv',
        headers: true,
        separator: ',',
        columns: [
            { name: 'id', type: 'int' },
            { name: 'name', type: 'varchar(255)' }
        ]
    },
    three: {
        file: './test/NDHUB.AirportRunways.csv',
        headers: true,
        separator: ',',
    }
});

// db.query('select la, bla, "wut" as something, id = name from one, two where one = two and id in (select id from two)').then(render).catch(error);
// db.query('select id from one, two where one.id <> two.id').then(render).catch(error);
// db.query('select * from one where id = (select id from two where name="twelve")').then(render).catch(error);
// db.query('select id as something from one where name = "one"').then(render).catch(error);
// db.query('select * from one, two where one.id = two.id').then(render).catch(error);
// db.query('select avg(distinct id) as dist, avg(id) as wut from one').then(render).catch(error);
// db.query('select count(*) as all, count(distinct id) as wut from one').then(render).catch(error);
// db.query('select one.id, one.name from one, two where one.id=two.id order by one.name desc').then(render).catch(error);
// db.query('select id, avg(id), count(*) from one where id < 5 group by id').then(render).catch(error);
db.query('select 1 as one, * from one order by id * 1 desc limit 3').then(render).catch(error);
// db.query('select OBJECTID, count(*) from three group by OBJECTID having count(*) > 1 order by OBJECTID * 1').then(render).catch(error);

function render(result) {
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

    console.log(text);
}

function error(msg) {
    console.log('ERROR:', msg.message, '\n', msg.stack);
}