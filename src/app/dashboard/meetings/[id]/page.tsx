import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/session";
import MeetingDetailEditor from "@/components/meetings/MeetingDetailEditor";
import Link from "next/link";

export default async function MeetingDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { organizationId } = await requireAuth();
  const { id } = await params;

  const meeting = await prisma.meeting.findFirst({
    where: { id, organizationId },
    include: { company: { select: { id: true, name: true, slug: true } } },
  });
  if (!meeting) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Meeting not found</h1>
      </div>
    );
  }

  const extraction = await prisma.meetingExtraction.findUnique({
    where: { meetingId: meeting.id },
  });

  const createdTasks = await prisma.task.findMany({
    where: { meetingId: meeting.id },
    select: {
      id: true,
      name: true,
      dueDate: true,
      priority: true,
      assignedToId: true,
      companyId: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const companies = await prisma.company.findMany({
    where: { organizationId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true },
  });

  // ✅ MySQL JSON filtering uses JSONPath string for `path`
  const minutesDoc = await prisma.organizationDocument.findFirst({
    where: {
      organizationId,
      category: "meeting_minutes",
      metadata: {
        path: "$.meetingId",
        equals: meeting.id,
      },
    },
    select: { id: true, fileUrl: true },
  });

  return (
    <div className="space-y-6">
      <header className="space-y-1 mb-0 px-4 py-2 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">
              {meeting.title ?? "Meeting"}{" "}
              <span className="text-xs align-middle ml-2 rounded bg-gray-100 px-2 py-0.5">
                {meeting.status}
              </span>
            </h1>
            <p className="text-sm text-muted-foreground">
              {meeting.company
                ? `Company: ${meeting.company.name}`
                : "No company"}
            </p>
          </div>
          {minutesDoc && (
            <Link
              href={
                minutesDoc.fileUrl || `/dashboard/documents/${minutesDoc.id}`
              }
              className="text-sm underline"
            >
              View minutes document →
            </Link>
          )}
        </div>
      </header>

      <MeetingDetailEditor
        meetingId={meeting.id}
        organizationId={organizationId!}
        initialSummary={extraction?.summary ?? ""}
        initialDecisions={extraction?.decisions ?? ""}
        companies={companies}
        createdTasks={createdTasks}
        minutesDocInitial={
          minutesDoc
            ? {
                id: minutesDoc.id,
                url:
                  minutesDoc.fileUrl || `/dashboard/documents/${minutesDoc.id}`,
              }
            : null
        }
      />
    </div>
  );
}
