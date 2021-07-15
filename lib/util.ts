import sharedb from "sharedb/lib/client";

export const promiseSubscribe = (doc: sharedb.Doc) => {
  return new Promise((resolve, reject) => {
    doc.subscribe((err) => {
      if (err) {
        reject(err);
        return;
      }
      if (doc.type === null) {
        reject(
          new Error(
            "ShareDB document uninitialized. Check if the id is correct and you have initialised the document on the server."
          )
        );
        return;
      }
      resolve(null);
    });
  });
};
