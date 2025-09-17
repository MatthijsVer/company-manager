"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

const BlockNoteView = dynamic(
  async () => (await import("@blocknote/mantine")).BlockNoteView,
  { ssr: false }
);

type Props = {
  initialHTML?: string;
  onChangeHTML?: (html: string, plainText: string) => void;
  className?: string;
};

export default function RichNoteEditor({
  initialHTML,
  onChangeHTML,
  className,
}: Props) {
  // Create editor once
  const editor = useCreateBlockNote();

  // Seed from initialHTML
  useEffect(() => {
    (async () => {
      const html = (initialHTML && initialHTML.trim()) || "<p></p>";
      const blocks = await editor.tryParseHTMLToBlocks(html);
      editor.replaceBlocks(editor.document, blocks);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  // Emit HTML + plaintext on changes
  async function emit() {
    const html = await editor.blocksToHTMLLossy(editor.document);
    const el = document.createElement("div");
    el.innerHTML = html;
    const plain = (el.textContent || "").trim();
    onChangeHTML?.(html, plain);
  }

  return (
    <div className={className}>
      <BlockNoteView
        editor={editor}
        onChange={emit}
        style={{ height: "60vh" }}
      />
    </div>
  );
}
