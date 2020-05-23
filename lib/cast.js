export default function cast(value, type) {
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
        return new Date(value);
    } else {
        return value;
    }
};