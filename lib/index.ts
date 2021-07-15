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
import { promiseSubscribe } from "./util";

declare interface ShareDBMonaco {
  on(event: "ready", listener: () => void): this;
  on(event: "close", listener: () => void): this;
}

class ShareDBMonaco extends EventEmitter {
  WS: WebSocket;
  docs: {
    [key: string]: {
      [key: string]: sharedb.Doc;
    };
  } = {};
  private connection: any;
  activeDoc?: sharedb.Doc;
  bindings?: Bindings;

  /**
   * ShareDBMonaco
   * @param {ShareDBMonacoOptions} opts - Options object
   * @param {object} opts.request - map of namespace -> array of doc ids
   * @param {object}  opts.activeDoc - array of [namespace, doc id].
   * @param {string} opts.wsurl - URL for ShareDB Server API
   */
  constructor(opts: ShareDBMonacoOptions) {
    super();

    // Parameter checks
    if (!opts.request) {
      throw new Error("'request' is required but not provided");
    }
    if (!opts.activeDoc) {
        throw new Error("'activeDoc' is required but not provided");
      }
    if (!opts.wsurl) {
      throw new Error("'wsurl' is required but not provided");
    }

    if(opts.activeDoc.length !== 2){
        throw new Error("'activeDoc' format must be [namespace, id]");
    }

    let [ns, id] = opts.activeDoc;

    if(!(ns in opts.request) || opts.request[ns].indexOf(id) === -1){
        throw new Error("Provided active document is invalid");
    }

    let that = this;

    this.WS = new WebSocket(opts.wsurl);

    // Get one or more ShareDB Doc's
    const connection = new sharedb.Connection(this.WS as any);
    const docs = Object.entries(opts.request).map(([namespace, ids]) => {
      that.docs[namespace] = {};
      return ids.map((id: string) => {
        let doc = connection.get(namespace, id);
        that.docs[namespace][id] = doc;
        return doc;
      });
    });

    let allDocs: sharedb.Doc[] = [];
    Object.values(docs).forEach((namespace) => {
        Object.values(namespace).forEach((doc: any) => {
            allDocs.push(doc);
        })
    })

    Promise.all(allDocs.map((doc) => promiseSubscribe(doc))).then(() => {
      // Documents have been initialised, emit 'ready' event
      that.connection = connection;
      that.activeDoc = that.docs[ns][id];
      that.setActiveDoc(ns, id);
      that.emit("ready");
    });
  }

  // Attach editor to ShareDBMonaco
  add(monaco: editor.ICodeEditor, path: string, viewOnly?: boolean) {
    if (this.connection.state === "disconnected") {
      throw new Error(
        "add() called after close(). You cannot attach an editor once you have closed the ShareDB Connection."
      );
    }

    let sharePath = path || "";
    this.bindings = new Bindings({
      monaco: monaco,
      path: sharePath,
      doc: this.activeDoc,
      viewOnly: !!viewOnly,
    });
  }

  close() {
    if (this.bindings) {
      this.bindings.unlisten();
    }
    this.connection.close();
    this.emit("close");
  }

  setActiveDoc(namespace: string, id: string){
    if(!(namespace in this.docs)){
        throw new Error(`No active namespace "${namespace}"`)
    }
    const docs = this.docs[namespace];
    if(!(id in docs)){
        throw new Error(`No subscribed document with id "${id}" in namespace "${namespace}"`)
    }
    this.bindings?.setActiveDoc(docs[id]);
  }

  getConnection() {
    return this.connection;
  }
}

export default ShareDBMonaco;
