import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/session";

export default async function DocumentPage({
  params,
}: {
  params: { id: string };
}) {
  const { organizationId } = await requireAuth();

  const doc = await prisma.organizationDocument.findFirst({
    where: { id: params.id, organizationId },
    select: {
      id: true,
      fileName: true,
      category: true,
      description: true,
      metadata: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!doc) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Document not found</h1>
      </div>
    );
  }

  const html = (doc.metadata as any)?.html as string | undefined;

  return (
    <div className="p-0">
      <div className="border-b px-6 py-4">
        <h1 className="text-lg font-semibold">{doc.fileName}</h1>
        <p className="text-xs text-muted-foreground">{doc.category}</p>
      </div>

      <div className="p-0">
        {html ? (
          <iframe
            srcDoc={html}
            className="w-full"
            style={{ height: "calc(100vh - 90px)" }}
          />
        ) : (
          <div className="p-6">
            <p className="text-sm text-muted-foreground">
              This document doesn’t have inline HTML content.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
