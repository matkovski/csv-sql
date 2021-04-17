import Pass from './pass.js';
import InsertInto from './insert-into.js';
import InsertValues from './insert-values.js';
import InsertSelect from './insert-select.js';
import cast from '../cast.js';

/*
INSERT [LOW_PRIORITY | DELAYED | HIGH_PRIORITY] [IGNORE]
    [INTO] tbl_name
    [PARTITION (partition_name [, partition_name] ...)]
    [(col_name [, col_name] ...)]
    { {VALUES | VALUE} (value_list) [, (value_list)] ...
      |
      VALUES row_constructor_list
    }
    [AS row_alias[(col_alias [, col_alias] ...)]]
    [ON DUPLICATE KEY UPDATE assignment_list]

INSERT [LOW_PRIORITY | DELAYED | HIGH_PRIORITY] [IGNORE]
    [INTO] tbl_name
    [PARTITION (partition_name [, partition_name] ...)]
    [AS row_alias[(col_alias [, col_alias] ...)]]
    SET assignment_list
    [ON DUPLICATE KEY UPDATE assignment_list]

INSERT [LOW_PRIORITY | HIGH_PRIORITY] [IGNORE]
    [INTO] tbl_name
    [PARTITION (partition_name [, partition_name] ...)]
    [(col_name [, col_name] ...)]
    [AS row_alias[(col_alias [, col_alias] ...)]]
    {SELECT ... | TABLE table_name}
    [ON DUPLICATE KEY UPDATE assignment_list]

value:
    {expr | DEFAULT}

value_list:
    value [, value] ...

row_constructor_list:
    ROW(value_list)[, ROW(value_list)][, ...]

assignment:
    col_name = [row_alias.]value

assignment_list:
    assignment [, assignment] ...

*/

export default class Insert extends Pass {
    constructor(into, values, select) {
        super();

        this.into = into;
        this.values = values;
        this.select = select;
    }

    async run(tables) {
        let table = this.into.name.token;
        let cols = this.into.into.length && this.into.into.map(c => c.token) || tables[table].names;

        let rows = this.values && this.values.run(tables) || this.select && this.select.run(tables);
        rows || Pass.malformed('missing INSERT data');
        rows.some(row => row.length !== cols.length) && Pass.malformed('mismatching column count');
        tables[table] || Pass.malformed('unknown table ' + table);

        let names = tables[table].names;
        let types = tables[table].types;
        let idx = cols.reduce((a, n, i) => (a[n] = i, a), {});
        let fulls = rows.map(row => names.map((nm, i) => cast(nm in idx ? row[idx[nm]] : null, types[i])));

        return await tables[table].insert(fulls);
    }

    static build(walk) {
        if (!walk.perhaps.lc('insert')) {
            return;
        }

        let into = InsertInto.build(walk);
        let values = InsertValues.build(walk);
        let select = InsertSelect.build(walk);

        return new Insert(into, values, select);
    }
}
