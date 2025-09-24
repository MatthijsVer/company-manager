import { requireAuth } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, Receipt } from "lucide-react";
import Link from "next/link";

async function getTaxClasses(organizationId: string) {
  return prisma.taxClass.findMany({
    where: { organizationId },
    include: {
      rules: {
        orderBy: { priority: "asc" }
      },
      _count: {
        select: { Product: true }
      }
    },
    orderBy: { name: "asc" }
  });
}

export default async function TaxClassesPage() {
  const session = await requireAuth();
  const taxClasses = await getTaxClasses(session.organizationId!);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Tax Classes</h1>
          <p className="text-muted-foreground">
            Manage tax classes and rates for your products
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/catalog/tax-classes/new">
            <Plus className="h-4 w-4 mr-2" />
            New Tax Class
          </Link>
        </Button>
      </div>

      <div className="border rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 font-medium">Name</th>
              <th className="text-left p-3 font-medium">Description</th>
              <th className="text-left p-3 font-medium">Tax Rules</th>
              <th className="text-left p-3 font-medium">Products</th>
              <th className="text-right p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {taxClasses.map((taxClass) => (
              <tr key={taxClass.id} className="border-t hover:bg-muted/25">
                <td className="p-3">
                  <div className="font-medium">{taxClass.name}</div>
                </td>
                <td className="p-3 text-muted-foreground">
                  {taxClass.description || "-"}
                </td>
                <td className="p-3">
                  {taxClass.rules.length === 0 ? (
                    <span className="text-muted-foreground">No rules defined</span>
                  ) : (
                    <div className="space-y-1">
                      {taxClass.rules.slice(0, 2).map((rule) => (
                        <div key={rule.id} className="text-xs">
                          <span className="font-medium">{rule.name}:</span>{" "}
                          {Number(rule.rate)}%
                          {rule.country && ` (${rule.country}${rule.region ? `/${rule.region}` : ''})`}
                        </div>
                      ))}
                      {taxClass.rules.length > 2 && (
                        <div className="text-xs text-muted-foreground">
                          +{taxClass.rules.length - 2} more
                        </div>
                      )}
                    </div>
                  )}
                </td>
                <td className="p-3">
                  <span className="text-sm text-muted-foreground">
                    {taxClass._count.Product} products
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex gap-1 justify-end">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/dashboard/catalog/tax-classes/${taxClass.id}`}>
                        <Edit className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {taxClasses.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-3">
                    <Receipt className="h-8 w-8" />
                    <div>
                      <h3 className="font-medium">No tax classes yet</h3>
                      <p className="text-sm">
                        Create your first tax class to manage product taxes.
                      </p>
                    </div>
                    <Button asChild>
                      <Link href="/dashboard/catalog/tax-classes/new">
                        <Plus className="h-4 w-4 mr-2" />
                        Create Tax Class
                      </Link>
                    </Button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}