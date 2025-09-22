// components/documents/SafeHtmlIframe.tsx
"use client";

import { useMemo } from "react";

type Props = {
  fileUrl: string;
  className?: string;
  height?: number | string;
  // Set to true if you want the page to keep its own origin (usually not needed)
  allowSameOrigin?: boolean;
};

export default function SafeHtmlIframe({
  fileUrl,
  className,
  height = "80vh",
  allowSameOrigin = false,
}: Props) {
  // No scripts, no top-nav, no forms; optionally no same-origin
  const sandbox = useMemo(
    () =>
      [
        // intentionally omit "allow-scripts"
        "allow-popups",
        "allow-modals",
        "allow-pointer-lock",
        "allow-downloads",
        "allow-forms",
        // keep allow-same-origin OFF by default for stronger isolation
        allowSameOrigin ? "allow-same-origin" : null,
      ]
        .filter(Boolean)
        .join(" "),
    [allowSameOrigin]
  );

  return (
    <iframe
      src={fileUrl}
      sandbox={sandbox}
      referrerPolicy="no-referrer"
      className={className}
      style={{ width: "100%", height }}
    />
  );
}
