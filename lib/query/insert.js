import Pass from './pass.js';
import InsertInto from './insert-into.js';
import InsertValues from './insert-values.js';

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
    constructor(into, values) {
        super();

        this.into = into;
        this.values = values;
    }

    run(tables) {
        if (this.tables) {
            let names = Object.keys(tables);
            return {
                columns: ['table'],
                rows: names.map(v => [v]),
            };
        }
    }

    static build(walk) {
        if (!walk.perhaps.lc('insert')) {
            return;
        }

        let into = InsertInto.build(walk);
        let values = InsertValues.build(walk);

        return new Insert(into, values);
    }
}
