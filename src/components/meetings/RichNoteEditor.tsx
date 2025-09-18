"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useCallback } from "react";
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
  fullHeight?: boolean;
  isFullScreen?: boolean;
};

export default function RichNoteEditor({
  initialHTML,
  onChangeHTML,
  className,
  fullHeight,
  isFullScreen,
}: Props) {
  const editor = useCreateBlockNote();
  const seededRef = useRef(false);

  // Convert current doc to HTML + plaintext and bubble up
  const emit = useCallback(async () => {
    if (!onChangeHTML) return;
    const html = await editor.blocksToHTMLLossy(editor.document);
    const el = document.createElement("div");
    el.innerHTML = html;
    const plain = (el.textContent || "").trim();
    onChangeHTML(html, plain);
  }, [editor, onChangeHTML]);

  // Seed from initialHTML exactly once, then emit once
  useEffect(() => {
    if (seededRef.current) return;
    (async () => {
      const html = (initialHTML && initialHTML.trim()) || "<p></p>";
      const blocks = await editor.tryParseHTMLToBlocks(html);
      editor.replaceBlocks(editor.document, blocks);
      seededRef.current = true;
      // emit initial state so parent gets summary/decisions immediately
      emit();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  return (
    <div
      className={className}
      style={{
        ...(fullHeight
          ? { display: "flex", flexDirection: "column", height: "100%" }
          : {}),
        ...(isFullScreen
          ? { maxWidth: "54vw", marginLeft: "auto", marginRight: "auto" }
          : {}),
      }}
    >
      <div className="h-full" style={{ flex: 1 }}>
        <BlockNoteView
          editor={editor}
          // This fires on every user change (typing, formatting, slash commands)
          onChange={emit}
          data-theming-css-demo
          theme="light"
        />
      </div>
    </div>
  );
}
