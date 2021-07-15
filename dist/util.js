"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.promiseSubscribe = void 0;
var promiseSubscribe = function (doc) {
    return new Promise(function (resolve, reject) {
        doc.subscribe(function (err) {
            if (err) {
                reject(err);
                return;
            }
            if (doc.type === null) {
                reject(new Error("ShareDB document uninitialized. Check if the id is correct and you have initialised the document on the server."));
                return;
            }
            resolve(null);
        });
    });
};
exports.promiseSubscribe = promiseSubscribe;
