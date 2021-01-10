import DB from './index.js';
import fs from 'fs';

let queries = [
    ['select all from t1', 131],
    ['select * from t1', 131],
    ['select 1', 1],
    ['select (select 1)', 1],
    ['select (select distinct 1 from t1)', 1],
    ['select OBJECTID from t1', 131],
    ['select OBJECTID, FULLNAME from t1', 131],
    ['select OBJECTID, * from t1', 131],
    ['select OBJECTID from (select OBJECTID from t1)', 131],
    ['select OBJECTID + 10 from t1', 131],
    ['select OBJECTID from t1 where OBJECTID > 10', 121],
    ['select OBJECTID / 10 from t1', 131],
    ['select FULLNAME from t1 where OBJECTID > 10', 121],
    ['select * from t1 where OBJECTID > 10', 121],
    ['select count(*) from t1 where OBJECTID > 10', 1],
];

queries = fs.readFileSync('./sql-failed.txt', 'utf-8').split('\n');

let db = new DB(['./data/NDHUB.AirportRunways.csv'], true, ',');

let failed = [];

(async () => {
    // await Promise.all(queries.map(async([query, count]) => {
    await Promise.all(queries.map(async(query) => {
        try {
            if (query) {
                await db.query(query);
            }
        } catch(e) {
            failed.push(query);
            console.log(query + '\nERROR: ' + e.message);
        }
    }));

    fs.writeFileSync('./sql-failed.txt', failed.join('\n'), 'utf-8');
})();
