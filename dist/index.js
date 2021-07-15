"use strict";
/**
 * sharedb-monaco
 * ShareDB bindings for the Monaco Editor
 *
 * @name index.ts
 * @author Carl Ian Voller <carlvoller8@gmail.com>
 * @license MIT
 */
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var reconnecting_websocket_1 = __importDefault(require("reconnecting-websocket"));
var event_emitter_es6_1 = __importDefault(require("event-emitter-es6"));
var client_1 = __importDefault(require("sharedb/lib/client"));
var bindings_1 = __importDefault(require("./bindings"));
var util_1 = require("./util");
var ShareDBMonaco = /** @class */ (function (_super) {
    __extends(ShareDBMonaco, _super);
    /**
     * ShareDBMonaco
     * @param {ShareDBMonacoOptions} opts - Options object
     * @param {object} opts.request - map of namespace -> array of doc ids
     * @param {object}  opts.activeDoc - array of [namespace, doc id].
     * @param {string} opts.wsurl - URL for ShareDB Server API
     */
    function ShareDBMonaco(opts) {
        var _this = _super.call(this) || this;
        _this.docs = {};
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
        if (opts.activeDoc.length !== 2) {
            throw new Error("'activeDoc' format must be [namespace, id]");
        }
        var _a = opts.activeDoc, ns = _a[0], id = _a[1];
        if (!(ns in opts.request) || opts.request[ns].indexOf(id) === -1) {
            throw new Error("Provided active document is invalid");
        }
        var that = _this;
        _this.WS = new reconnecting_websocket_1.default(opts.wsurl);
        // Get one or more ShareDB Doc's
        var connection = new client_1.default.Connection(_this.WS);
        var docs = Object.entries(opts.request).map(function (_a) {
            var namespace = _a[0], ids = _a[1];
            that.docs[namespace] = {};
            return ids.map(function (id) {
                var doc = connection.get(namespace, id);
                that.docs[namespace][id] = doc;
                return doc;
            });
        });
        var allDocs = [];
        Object.values(docs).forEach(function (namespace) {
            Object.values(namespace).forEach(function (doc) {
                allDocs.push(doc);
            });
        });
        Promise.all(allDocs.map(function (doc) { return util_1.promiseSubscribe(doc); })).then(function () {
            // Documents have been initialised, emit 'ready' event
            that.connection = connection;
            that.activeDoc = that.docs[ns][id];
            that.setActiveDoc(ns, id);
            that.emit("ready");
        });
        return _this;
    }
    // Attach editor to ShareDBMonaco
    ShareDBMonaco.prototype.add = function (monaco, path, viewOnly) {
        if (this.connection.state === "disconnected") {
            throw new Error("add() called after close(). You cannot attach an editor once you have closed the ShareDB Connection.");
        }
        var sharePath = path || "";
        this.bindings = new bindings_1.default({
            monaco: monaco,
            path: sharePath,
            doc: this.activeDoc,
            viewOnly: !!viewOnly,
        });
    };
    ShareDBMonaco.prototype.close = function () {
        if (this.bindings) {
            this.bindings.unlisten();
        }
        this.connection.close();
        this.emit("close");
    };
    ShareDBMonaco.prototype.setActiveDoc = function (namespace, id) {
        var _a;
        if (!(namespace in this.docs)) {
            throw new Error("No active namespace \"" + namespace + "\"");
        }
        var docs = this.docs[namespace];
        if (!(id in docs)) {
            throw new Error("No subscribed document with id \"" + id + "\" in namespace \"" + namespace + "\"");
        }
        (_a = this.bindings) === null || _a === void 0 ? void 0 : _a.setActiveDoc(docs[id]);
    };
    ShareDBMonaco.prototype.getConnection = function () {
        return this.connection;
    };
    return ShareDBMonaco;
}(event_emitter_es6_1.default));
exports.default = ShareDBMonaco;
