"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Building2,
  Edit,
  MoreHorizontal,
  Archive,
  Trash,
  Users,
  FileText,
  Activity,
  StickyNote,
  ArrowLeft,
  LayoutDashboard,
  ListTodo,
  ChartGantt,
  KanbanSquare,
} from "lucide-react";
import { CompanyOverview } from "@/components/companies/details/company-overview";
import { CompanyTeamManager } from "@/components/companies/details/company-team-manager";
import { CompanyTasks } from "@/components/companies/details/company-tasks";
import { KanbanBoard } from "@/components/companies/details/company-kanban";
import { MultiBoardView } from "@/components/companies/details/multi-board-view";
import TimelinePage from "@/components/companies/details/timeline-view";

interface Company {
  id: string;
  name: string;
  slug: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: any;
  industry: string | null;
  size: string | null;
  annualRevenue: string | null;
  description: string | null;
  status: string;
  type: string;
  tags: string | null;
  rating: number | null;
  customFields: any;
  metadata: any;
  createdAt: string;
  updatedAt: string;
}

export default function CompanyDetailPage() {
  const params = useParams();
  const router = useRouter();

  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    if (params.id) {
      fetchCompany();
      fetchSession();
    }
  }, [params.id]);

  const fetchSession = async () => {
    try {
      const res = await fetch("/api/auth/session");
      if (res.ok) {
        const sessionData = await res.json();
        setSession(sessionData);
      }
    } catch (error) {
      console.error("Failed to fetch session:", error);
    }
  };

  const fetchCompany = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/companies/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setCompany(data);
      } else if (res.status === 404) {
        router.push("/dashboard/projects");
      }
    } catch (error) {
      console.error("Failed to fetch company:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    console.log("Edit company");
  };

  const handleArchive = async () => {
    if (!company || !confirm("Are you sure you want to archive this company?"))
      return;

    try {
      const res = await fetch(`/api/companies/${company.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ARCHIVED" }),
      });

      if (res.ok) {
        fetchCompany();
      }
    } catch (error) {
      console.error("Failed to archive company:", error);
    }
  };

  const handleDelete = async () => {
    if (
      !company ||
      !confirm(
        "Are you sure you want to delete this company? This action cannot be undone."
      )
    )
      return;

    try {
      const res = await fetch(`/api/companies/${company.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        router.push("/dashboard/projects");
      }
    } catch (error) {
      console.error("Failed to delete company:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="flex gap-4">
          <Skeleton className="h-32 flex-1" />
          <Skeleton className="h-32 w-80" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Company not found</h2>
        <Button onClick={() => router.push("/dashboard/projects")}>
          Back to Companies
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center relative gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/dashboard/projects")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>

            <div className="ml-0">
              <div className="flex items-center gap-3">
                <h1 className="text-lg font-semibold">{company.name}</h1>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={handleEdit} variant="ghost">
              <Edit className="h-4 w-4" />
              Edit
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="bg-[#222222] border-[#222222] text-white"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleArchive}>
                  <Archive className="mr-2 h-4 w-4" />
                  Archive
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="text-destructive"
                >
                  <Trash className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-1 flex items-center overflow-auto">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="h-full w-full"
        >
          <div className="border-b bg-test flex w items-center w-full px-6">
            <TabsList className="h-11 bg-transparent p-0 border-0 gap-4">
              <TabsTrigger
                value="overview"
                className="data-[state=active]:bg-transparent shadow-none border-0 data-[state=active]:border-primary data-[state=active]:text-black text-[#707070] rounded-none"
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger
                value="planning"
                className="data-[state=active]:bg-transparent shadow-none border-0 data-[state=active]:border-primary data-[state=active]:text-black text-[#707070] rounded-none"
              >
                <ChartGantt className="h-4 w-4" />
                Planning
              </TabsTrigger>
              <TabsTrigger
                value="tasks"
                className="data-[state=active]:bg-transparent shadow-none border-0 data-[state=active]:border-primary data-[state=active]:text-black text-[#707070] rounded-none"
              >
                <ListTodo className="h-4 w-4" />
                Tasks
              </TabsTrigger>
              <TabsTrigger
                value="kanban"
                className="data-[state=active]:bg-transparent shadow-none border-0 data-[state=active]:border-primary data-[state=active]:text-black text-[#707070] rounded-none"
              >
                <KanbanSquare className="h-4 w-4" />
                Kanban
              </TabsTrigger>
            </TabsList>

            {/* Team Manager Component */}
            {company && (
              <CompanyTeamManager
                companyId={company.id}
                onUpdate={fetchCompany}
              />
            )}
          </div>

          <div className="p-0 -mt-2 h-full">
            <TabsContent value="overview" className="mt-0 h-full">
              <CompanyOverview
                company={company}
                onUpdate={fetchCompany}
                session={session}
              />
            </TabsContent>

            <TabsContent value="planning" className="mt-0">
              <TimelinePage params={params} />
            </TabsContent>

            <TabsContent value="tasks" className="mt-0 h-full">
              <CompanyTasks companyId={company.id} session={session} />
            </TabsContent>

            <TabsContent value="documents" className="mt-0">
              hey
            </TabsContent>

            <TabsContent value="kanban" className="mt-0">
              <MultiBoardView
                companyId={params?.id}
                userId={session?.userId}
                userRole={session?.role}
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
