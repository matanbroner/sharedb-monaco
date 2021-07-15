// Type definitions for sharedb-monaco
// Project: https://github.com/codecollab-io/sharedb-monaco
// Definitions by: Carl Voller <https://github.com/Portatolova>
// TypeScript Version: 3.0

import { editor } from "monaco-editor";
import sharedb from "sharedb/lib/client";

export interface ShareDBMonacoOptions {
  request: {
    [key: string]: string[]
  };
  activeDoc: string[];
  wsurl: string;
}

export interface BindingsOptions {
  monaco: editor.ICodeEditor;
  path: string;
  doc?: sharedb.Doc;
  viewOnly: boolean;
}
