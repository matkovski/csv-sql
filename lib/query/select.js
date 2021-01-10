/*
SELECT √
    √ [ALL | DISTINCT | DISTINCTROW ]
    [HIGH_PRIORITY]
    [STRAIGHT_JOIN]
    [SQL_SMALL_RESULT] [SQL_BIG_RESULT] [SQL_BUFFER_RESULT]
    [SQL_NO_CACHE] [SQL_CALC_FOUND_ROWS]
    √ select_expr [, select_expr] ...
    [into_option]
    √ [FROM table_references
      [PARTITION partition_list]]
    √ [WHERE where_condition]
    [GROUP BY {col_name | expr | position}, ... [WITH ROLLUP]]
    √ [HAVING where_condition]
    [WINDOW window_name AS (window_spec)
        [, window_name AS (window_spec)] ...]
    √ [ORDER BY {col_name | expr | position} [ASC | DESC], ... [WITH ROLLUP]]
    √ [LIMIT {[offset,] row_count | row_count OFFSET offset}]
    [into_option]
    [FOR {UPDATE | SHARE}
        [OF tbl_name [, tbl_name] ...]
        [NOWAIT | SKIP LOCKED]
      | LOCK IN SHARE MODE]
    [into_option]
*/

import Pass from './pass.js';
import SelectModifiers from './select-modifiers.js';
import SelectList from './select-list.js';
import SelectFrom from './select-from.js';
import SelectWhere from './select-where.js';
import SelectOrderBy from './select-orderby.js';
import SelectGroupBy from './select-groupby.js';
import SelectHaving from './select-having.js';
import SelectLimit from './select-limit.js';

export default class Select extends Pass {
    constructor(walk) {
        super();

        this.modifiers = SelectModifiers.build(walk);
        this.list = SelectList.build(walk, Select);
        // TODO: INTO
        this.from = SelectFrom.build(walk, Select);
        // TODO: partition?
        this.where = SelectWhere.build(walk, Select);
        this.group = SelectGroupBy.build(walk, Select);
        this.having = SelectHaving.build(walk, Select);
        this.order = SelectOrderBy.build(walk, Select);
        this.limit = SelectLimit.build(walk, Select);
    }

    run(tables) {
        if (this.from) {
            // TODO: modifiers
            let from = this.from && this.from.run(tables);
            let filtered = this.where.run(tables, from, this.list);
            let sorted = this.order.run(tables, from.columns, this.list.list, filtered);
            let having = this.having.run(tables, from, sorted, this.list, this.group);
            let aliased = this.list.run(tables, from, having, this.group);
            let modified = this.modifiers.run(tables, aliased);
            let limited = this.limit.run(modified);
            return {
                columns: this.list.prepared(from),
                rows: limited,
            };
        } else if (this.list) {
            let rows = this.list.run(tables, undefined, [[]], undefined);
            let columns = this.list.prepared([]);
            return {
                columns, rows
            }
            // not a table expression? check if there's no from or anything and evaluate if evaluable
        }
    }

    static build(walk) {
        if (!walk.perhaps.lc('select')) {
            return;
        }

        return new Select(walk);
    }

    toString() {
        return 'BLA';
    }
}
