import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/session";
import RecordUploadPanel from "@/components/meetings/RecordUploadPanel";
import MeetingActions from "@/components/meetings/MeetingActions";
import Link from "next/link";

export default async function MeetingsPage() {
  const { organizationId } = await requireAuth();

  const companies = await prisma.company.findMany({
    where: { organizationId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      Meeting: {
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true, status: true, createdAt: true },
        take: 10,
      },
    },
  });

  const simpleCompanies = companies.map((c) => ({ id: c.id, name: c.name }));
  const companiesWithMeetings = companies.filter((c) => c.Meeting.length > 0);

  return (
    <div className="flex flex-col items-start flex-1">
      <div className="flex items-start w-full flex-1">
        <section className="space-y-6 flex-1">
          <div className="flex items-center border-b py-3 px-4 w-full mb-0">
            Hye
          </div>

          <div className="p-4">
            {companiesWithMeetings.map((co) => (
              <div
                key={co.id}
                className="bg-white rounded-xl overflow-hidden border border-gray-200"
              >
                {/* Card Title */}
                <div className="px-6 pt-5 pb-3 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">
                    {co.name}
                  </h3>
                </div>

                {/* Header Row (grid, like your example) */}
                <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 border-b border-gray-200">
                  <div className="col-span-3 text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Created
                  </div>
                  <div className="col-span-3 text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Title
                  </div>
                  <div className="col-span-3 text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Status
                  </div>
                  <div className="col-span-3 text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Actions
                  </div>
                </div>

                {/* Rows */}
                {co.Meeting?.length ? (
                  co.Meeting.map((m: any) => (
                    <div
                      key={m.id}
                      className="grid grid-cols-12 gap-4 px-6 py-4 items-center border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors group"
                    >
                      <div className="col-span-3">
                        <span className="text-sm text-gray-700 whitespace-nowrap">
                          {new Date(
                            m.createdAt as unknown as string
                          ).toLocaleString()}
                        </span>
                      </div>

                      <div className="col-span-3">
                        <Link
                          href={`/dashboard/meetings/${m.id}`}
                          className="text-sm text-gray-900 hover:underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 rounded"
                        >
                          {m.title ?? "(untitled)"}
                        </Link>
                      </div>

                      <div className="col-span-3">
                        <span
                          className={`text-[10px] font-medium uppercase px-2 py-1 rounded-full ${getStatusClasses(
                            m.status
                          )}`}
                        >
                          {m.status}
                        </span>
                      </div>

                      <div className="col-span-3 flex">
                        {/* Reveal actions on hover for a cleaner look */}
                        <div className="transition-opacity">
                          <MeetingActions id={m.id} />
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-6 py-8 text-sm text-gray-500">
                    No meetings yet.
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
        <div className="border-l w-92 p-4 h-full">
          {/* Record / Upload Widget */}
          <RecordUploadPanel companies={simpleCompanies} />
        </div>
      </div>
    </div>
  );
}

function getStatusClasses(status?: string) {
  switch ((status || "").toLowerCase()) {
    case "scheduled":
    case "open":
      return "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20";
    case "completed":
    case "done":
      return "bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20";
    case "cancelled":
    case "canceled":
      return "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20";
    case "draft":
      return "bg-gray-50 text-gray-700 ring-1 ring-inset ring-gray-600/20";
    default:
      return "bg-gray-100 text-gray-700 ring-1 ring-inset ring-gray-300";
  }
}
