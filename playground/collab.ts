// two in-page peers standing in for a y-websocket server: document and awareness updates are relayed between them
import * as Y from "yjs";
import { Awareness, applyAwarenessUpdate, encodeAwarenessUpdate } from "y-protocols/awareness";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCaret from "@tiptap/extension-collaboration-caret";
import { collaborationCaret, type CaretUser, type CollaborationOptions } from "@skevo18/vue-wysiwyg-component";

interface Peer {
  doc: Y.Doc;
  awareness: Awareness;
}

const relay = Symbol("relay");

function link(a: Peer, b: Peer) {
  a.doc.on("update", (update: Uint8Array, origin: unknown) => {
    if (origin !== relay) Y.applyUpdate(b.doc, update, relay);
  });
  a.awareness.on("update", ({ added, updated, removed }: { added: number[]; updated: number[]; removed: number[] }, origin: unknown) => {
    if (origin !== relay) applyAwarenessUpdate(b.awareness, encodeAwarenessUpdate(a.awareness, [...added, ...updated, ...removed]), relay);
  });
}

function peer(): Peer {
  const doc = new Y.Doc();
  return { doc, awareness: new Awareness(doc) };
}

export function collaborators(users: CaretUser[]): CollaborationOptions[] {
  const peers = users.map(peer);
  for (const a of peers) for (const b of peers) if (a !== b) link(a, b);
  return peers.map(({ doc, awareness }, i) => ({
    extensions: [
      Collaboration.configure({ document: doc, field: "default" }),
      CollaborationCaret.configure({ provider: { awareness }, user: users[i], render: (user) => collaborationCaret(user as CaretUser) }),
    ],
  }));
}
