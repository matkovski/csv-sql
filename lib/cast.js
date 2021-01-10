// Not implemented
// ZEROFILL

// SERIAL = BIGINT UNSIGNED NOT NULL AUTO_INCREMENT UNIQUE
// SERIAL DEFAULT VALUE = NOT NULL AUTO_INCREMENT UNIQUE

// BIT[(m)] -- 1..64
// TINYINT[(M)][UNSIGNED][ZEROFILL] -- -128..128 or 0..255
// BOOL, BOOLEAN
// SMALLINT[(M)] [UNSIGNED] [ZEROFILL] -- -32768..32767 or 0..65535
// MEDIUMINT[(M)][UNSIGNED][ZEROFILL] -- -8388608..8388607 or 0..16777215
// INT[(M)] [UNSIGNED] [ZEROFILL] -- -2147483648..2147483647 or 0..4294967295
// INTEGER[(M)] [UNSIGNED] [ZEROFILL] -----
// BIGINT[(M)] [UNSIGNED] [ZEROFILL] -- -9223372036854775808..9223372036854775807 or 0..18446744073709551615
// DECIMAL[(M[, D])][UNSIGNED][ZEROFILL]
// DEC[(M[, D])][UNSIGNED][ZEROFILL]
// NUMERIC[(M[, D])][UNSIGNED][ZEROFILL]
// FIXED[(M[, D])][UNSIGNED][ZEROFILL]
// FLOAT[(M, D)][UNSIGNED][ZEROFILL] -- -3.402823466E+38..-1.175494351E-38 and 1.175494351E-38..3.402823466E+38
// FLOAT(p) [UNSIGNED] [ZEROFILL] -- p precision means FLOAT or DOUBLE
// DOUBLE[(M,D)] [UNSIGNED] [ZEROFILL]
// DOUBLE PRECISION[(M,D)] [UNSIGNED] [ZEROFILL]
// REAL[(M,D)] [UNSIGNED] [ZEROFILL]

export function cast(value, type) {
    if (typeof value !== 'string') {
        value = String(value || '');
    }
    if (type === 'number') {
        if (typeof value === 'object' && 'rows' in value && 'columns' in value) {
            if (value.columns.length === 1 && value.columns[0].length === 1) {
                return + value.columns[0][0];
            } else {
                throw new Error('Cannot cast a multi-value result set to a single value')
            }
        }
        return + value;
    } else if (type === 'datetime') {
        return new Date(value) || new Date(0);
    } else {
        return value;
    }
};

export function caster(type) {
}

export function single(value) {
    if (typeof value !== 'object') {
        return value;
    }

    let rows = value.rows;
    if (!Array.isArray(rows)) {
        return value;
    }
    if (rows.length === 0) {
        return null;
    }
    if (rows.length > 2) {
        throw new Error('Multiple rows returned where only a single value expected');
    }
    if (rows[0].length !== 1) {
        throw new Error('Multiple rows returned where only a single value expected');
    }
    return rows[0][0];
}

export default cast;
