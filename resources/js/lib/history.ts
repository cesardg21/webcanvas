type Entry<T> = { before: T; after: T };

export class CanvasHistory<T> {
    private past: Entry<T>[] = [];
    private future: Entry<T>[] = [];
    private group: string | undefined;

    private limit: number;

    constructor(limit = 100) { this.limit = limit; }

    get canUndo() { return this.past.length > 0; }
    get canRedo() { return this.future.length > 0; }

    clear() { this.past = []; this.future = []; this.breakGroup(); }

    breakGroup() { this.group = undefined; }

    record(before: T, after: T, group?: string) {
        if (JSON.stringify(before) === JSON.stringify(after)) return;
        if (group && this.group === group && this.past.length) {
            this.past[this.past.length - 1].after = after;
        } else {
            this.past.push({ before, after });
            if (this.past.length > this.limit) this.past.shift();
        }
        this.group = group;
        this.future = [];
    }

    undo(): T | undefined {
        this.breakGroup();
        const entry = this.past.pop();
        if (!entry) return;
        this.future.push(entry);
        return entry.before;
    }

    redo(): T | undefined {
        this.breakGroup();
        const entry = this.future.pop();
        if (!entry) return;
        this.past.push(entry);
        return entry.after;
    }
}
