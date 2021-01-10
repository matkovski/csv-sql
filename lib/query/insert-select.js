import Pass from './pass.js';
import Select from './select.js';

export default class InsertSelect extends Pass {
    constructor(select) {
        super();
        this.select = select;
    }

    run(tables) {
        if (!this.select) {
            return;
        }

        let result = this.select.run(tables);
        return result.rows;
    }

    static build(walk) {
        let select = Select.build(walk);
        return select && new InsertSelect(select);
   }
}