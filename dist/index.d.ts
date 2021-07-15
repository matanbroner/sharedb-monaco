/**
 * sharedb-monaco
 * ShareDB bindings for the Monaco Editor
 *
 * @name index.ts
 * @author Carl Ian Voller <carlvoller8@gmail.com>
 * @license MIT
 */
import WebSocket from "reconnecting-websocket";
import EventEmitter from "event-emitter-es6";
import sharedb from "sharedb/lib/client";
import { editor } from "monaco-editor";
import { ShareDBMonacoOptions } from "./types";
import Bindings from "./bindings";
declare interface ShareDBMonaco {
    on(event: "ready", listener: () => void): this;
    on(event: "close", listener: () => void): this;
}
declare class ShareDBMonaco extends EventEmitter {
    WS: WebSocket;
    docs: {
        [key: string]: {
            [key: string]: sharedb.Doc;
        };
    };
    private connection;
    activeDoc?: sharedb.Doc;
    bindings?: Bindings;
    /**
     * ShareDBMonaco
     * @param {ShareDBMonacoOptions} opts - Options object
     * @param {object} opts.request - map of namespace -> array of doc ids
     * @param {object}  opts.activeDoc - array of [namespace, doc id].
     * @param {string} opts.wsurl - URL for ShareDB Server API
     */
    constructor(opts: ShareDBMonacoOptions);
    add(monaco: editor.ICodeEditor, path: string, viewOnly?: boolean): void;
    close(): void;
    setActiveDoc(namespace: string, id: string): void;
    getConnection(): any;
}
export default ShareDBMonaco;
