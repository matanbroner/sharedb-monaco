/**
 * @fileOverview
 * @name bindings.ts
 * @author Carl Voller <carlvoller8@gmail.com>
 * @license MIT
 */

import { editor } from "monaco-editor";
import { Range } from "./Range";
import sharedb from "sharedb/lib/client";
import { BindingsOptions } from "./types";

class Bindings {
    private suppress: boolean;
    private editor: editor.ICodeEditor;
    private path: string;
    private doc?: sharedb.Doc;
    private model: editor.ITextModel;
    private lastValue: string;
    private viewOnly: boolean;

    constructor(options: BindingsOptions) {
        this.suppress = false;
        this.editor = options.monaco;
        this.path = options.path;
        this.doc = options.doc;
        this.model = (this.editor.getModel() as editor.ITextModel);
        this.lastValue = this.model.getValue();
        this.viewOnly = options.viewOnly;

        this.setInitialValue();

        this.onLocalChange = this.onLocalChange.bind(this);
        this.onRemoteChange = this.onRemoteChange.bind(this);

        this.listen();
    }

    // Sets the monaco editor's value to the ShareDB document's value
    setInitialValue() {
        this.suppress = true;
        this.model.setValue(this.doc?.data[this.path]);
        this.lastValue = this.doc?.data[this.path];
        this.suppress = false;
    }

    // Listen for both monaco editor changes and ShareDB changes
    listen() {
        if(!this.viewOnly) { this.editor.onDidChangeModelContent(this.onLocalChange); }
        this.doc?.on('op', this.onRemoteChange);
    }

    // Stop listening for changes
    unlisten() {
        if(!this.viewOnly) { this.editor.onDidChangeModelContent(() => {}); }
        this.doc?.on('op', this.onRemoteChange);
    }

    setActiveDoc(doc: sharedb.Doc){
        this.doc = doc;
        this.setInitialValue();
    }

    // Transform monaco content change delta to ShareDB Operation.
    deltaTransform(delta: editor.IModelContentChange) {
        const { rangeOffset, rangeLength, text } = delta;
        
        let op: Array<any>;
        if (text.length > 0 && rangeLength === 0) {
            op = this.getInsertOp(rangeOffset, text);
        } else if (text.length > 0 && rangeLength > 0) {
            op = this.getReplaceOp(rangeOffset, rangeLength, text);
        } else if (text.length === 0 && rangeLength > 0) {
            op = this.getDeleteOp(rangeOffset, rangeLength);
        } else {
            throw new Error("Unexpected change: " + JSON.stringify(delta));
        }

        return op;
    }

    // Converts insert operation into json0 (sharedb-op)
    getInsertOp(index: number, text: string) {
        let p = [this.path, index],
            a = "si",
            s = text;
        
        let op: any = { p: p };
        op[a] = s;
        return [op];
    }

    // Converts delete operation into json0 (sharedb-op)
    getDeleteOp(index: number, length: number) {

        let text = this.lastValue.slice(index , index + length);

        let p = [this.path, index],
            a = "sd",
            s = text;
        
        let op: any = { p: p };
        op[a] = s;
        return [op];
    }

    // Converts replace operation into json0 (sharedb-op)
    getReplaceOp(index: number, length: number, text: string) {

        let oldText = this.lastValue.slice(index , index + length);

        let p = [this.path, index],
            a1 = "sd",
            s1 = oldText,
            a2 = "si",
            s2 = text
        
        let op1: any = { p: p },
            op2: any = { p: p };
        op1[a1] = s1;
        op2[a2] = s2;
        return [op1, op2];
    }

    // Transforms ShareDB Operations to monaco deltas to be applied.
    opTransform(ops: Array<any>) {

        let model = this.model;
        this.suppress = true;

        for(let i = 0; i < ops.length; i++) {
            let op = ops[i];
            const index = op.p[op.p.length - 1];
            const pos = model.getPositionAt(index);
            const start = pos;

            let edits: Array<editor.IIdentifiedSingleEditOperation> = [];

            if("sd" in op) {
                const end = model.getPositionAt(index + op.sd.length);
                edits.push({
                    range: new Range(start.lineNumber, start.column, end.lineNumber, end.column),
                    text: "",
                    forceMoveMarkers: true
                });
            }

            if("si" in op) {
                edits.push({
                    range: new Range(start.lineNumber, start.column, start.lineNumber, start.column),
                    text: op.si,
                    forceMoveMarkers: true
                });
            }

            if(this.viewOnly) { this.editor.updateOptions({ readOnly: false }); }
            this.editor.executeEdits("remote", edits);
            if(this.viewOnly) { this.editor.updateOptions({ readOnly: true }); }
        }
        this.suppress = false;
    }

    // Handles local editor change events
    onLocalChange(delta: editor.IModelContentChangedEvent) {
        if(this.suppress) { return; }

        let ops: Array<any> = [];
        for(let i = 0; i < delta.changes.length; i++) {
            ops = ops.concat(this.deltaTransform(delta.changes[i]));
        }

        this.lastValue = this.model.getValue();

        this.doc?.submitOp(ops, { source: true }, (err) => {
            if(err) throw err;
            if(this.model.getValue() !== this.doc?.data[this.path]) {
                this.suppress = true;
                let cursor = this.editor.getPosition();
                this.model.setValue(this.doc?.data[this.path]);
                if(cursor) { this.editor.setPosition(cursor); }
                this.suppress = false;
            }
        });
    }

    // Handles remote operations from ShareDB
    onRemoteChange(ops: Array<any>, source: any) {
        if(ops.length === 0) { return; }

        const opsPath = ops[0].p.slice(0, ops[0].p.length - 1).toString();
        if(source === true || opsPath !== this.path) {
            return;
        }

        this.opTransform(ops);

        this.lastValue = this.model.getValue();
    }
}

export default Bindings;