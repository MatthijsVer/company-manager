import DocumentComposer from "@/components/documents/DocumentComposer";

export default async function NewDocumentPage({
  searchParams,
}: {
  searchParams: { folderId?: string; title?: string };
}) {
  const awaitedSearch = await searchParams;
  const folderId = awaitedSearch.folderId ?? null;
  const initialTitle = awaitedSearch.title ?? "Untitled";
  return (
    <div className="" style={{ backgroundColor: "oklch(0.94 0 0)" }}>
      <DocumentComposer
        defaultFolderId={folderId}
        initialTitle={initialTitle}
      />
    </div>
  );
}
