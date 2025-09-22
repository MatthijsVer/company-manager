// src/components/meetings/RichNoteEditor.tsx
"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useCallback, useState } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

// Mantine view must be client-only
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
  editable?: boolean;
};

export default function RichNoteEditor(props: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    // Skeleton keeps hook order stable across SSR/CSR
    return (
      <div
        className={props.className}
        style={{
          ...(props.fullHeight ? { height: "100%" } : {}),
          background: "white",
          borderRadius: 12,
          minHeight: "12rem",
        }}
      />
    );
  }

  return <EditorRuntime {...props} />;
}

function EditorRuntime({
  initialHTML,
  onChangeHTML,
  className,
  fullHeight,
  isFullScreen,
  editable = true,
}: Props) {
  const editor = useCreateBlockNote();
  const seededRef = useRef(false);

  const emit = useCallback(async () => {
    if (!onChangeHTML) return;
    const html = await editor.blocksToHTMLLossy(editor.document);
    const el = document.createElement("div");
    el.innerHTML = html;
    const plain = (el.textContent || "").trim();
    onChangeHTML(html, plain);
  }, [editor, onChangeHTML]);

  // Seed exactly once, then emit once
  useEffect(() => {
    if (seededRef.current) return;
    (async () => {
      const html = (initialHTML && initialHTML.trim()) || "<p></p>";
      const blocks = await editor.tryParseHTMLToBlocks(html);
      editor.replaceBlocks(editor.document, blocks);
      seededRef.current = true;
      await emit();
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
          onChange={editable ? emit : undefined}
          data-theming-css-demo
          theme="light"
          editable={editable}
        />
      </div>
    </div>
  );
}
