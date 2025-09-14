"use client";

import * as React from "react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Folder,
  MoreHorizontal,
  Plus,
  Search,
  ChevronRight,
  LayoutDashboard,
  KanbanSquare,
  ListTodo,
  Calendar,
  FileText,
  Users,
  Settings,
  ChartGantt,
} from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarMenuAction,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface Project {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  color?: string;
  status: string;
  organizationId: string;
}

const projectMenuItems = [
  { title: "Dashboard", url: "dashboard", icon: LayoutDashboard },
  { title: "Planning", url: "planning", icon: ChartGantt },
  { title: "Kanban", url: "kanban", icon: KanbanSquare },
  { title: "Tasks", url: "tasks", icon: ListTodo },
  { title: "Calendar", url: "calendar", icon: Calendar },
  { title: "Documents", url: "documents", icon: FileText },
  { title: "Team", url: "team", icon: Users },
  { title: "Settings", url: "settings", icon: Settings },
];

export function NavProjects() {
  const pathname = usePathname();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(
    new Set()
  );

  // Fetch projects on mount
  useEffect(() => {
    fetchProjects();
  }, []);

  // Auto-expand current project based on URL
  useEffect(() => {
    const pathSegments = pathname.split("/");
    const projectIndex = pathSegments.findIndex((seg) => seg === "projects");
    if (projectIndex !== -1 && pathSegments[projectIndex + 1]) {
      const projectSlug = pathSegments[projectIndex + 1];
      const project = projects.find((p) => p.slug === projectSlug);
      if (project) {
        setExpandedProjects((prev) => new Set(prev).add(project.id));
      }
    }
  }, [pathname, projects]);

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/projects?limit=50"); // Get more projects initially
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);

        // Cache in sessionStorage for performance
        sessionStorage.setItem(
          "cached_projects",
          JSON.stringify({
            data: data.projects || [],
            timestamp: Date.now(),
          })
        );
      }
    } catch (error) {
      console.error("Failed to fetch projects:", error);

      // Try to use cached data if available
      const cached = sessionStorage.getItem("cached_projects");
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        // Use cache if less than 5 minutes old
        if (Date.now() - timestamp < 5 * 60 * 1000) {
          setProjects(data);
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleProject = useCallback((projectId: string) => {
    setExpandedProjects((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      return newSet;
    });
  }, []);

  // Memoized filtered projects for performance
  const filteredProjects = useMemo(() => {
    if (!searchQuery) return projects;

    const query = searchQuery.toLowerCase();
    return projects.filter((project) =>
      project.name.toLowerCase().includes(query)
    );
  }, [projects, searchQuery]);

  const getProjectInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const isProjectActive = (projectSlug: string) => {
    return pathname.includes(`/projects/${projectSlug}`);
  };

  const isSubItemActive = (projectSlug: string, itemUrl: string) => {
    return pathname === `/dashboard/projects/${projectSlug}/${itemUrl}`;
  };

  if (loading) {
    return (
      <SidebarGroup className="group-data-[collapsible=icon]:hidden">
        <SidebarGroupLabel>Projects</SidebarGroupLabel>
        <SidebarMenu>
          {[1, 2, 3].map((i) => (
            <SidebarMenuItem key={i}>
              <div className="flex items-center gap-2 px-2 py-1.5">
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-4 flex-1" />
              </div>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroup>
    );
  }

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel className="flex items-center justify-between">
        <span>Projects</span>
        <Button
          size="icon"
          variant="ghost"
          className="h-4 w-4 hover:bg-sidebar-accent"
          asChild
        >
          <Link href="/dashboard/projects/new">
            <Plus className="h-3 w-3" />
          </Link>
        </Button>
      </SidebarGroupLabel>

      {/* Search */}
      {projects.length > 5 && (
        <div className="px-2 pb-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-7 pl-7 text-xs"
            />
          </div>
        </div>
      )}

      {/* Overview Link */}
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            asChild
            isActive={pathname === "/dashboard/projects"}
            className="font-medium"
          >
            <Link href="/dashboard/projects">
              <Folder className="h-4 w-4" />
              <span>All Projects</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>

        {/* Project List */}
        {filteredProjects.length === 0 && searchQuery && (
          <div className="px-2 py-4 text-center text-xs text-muted-foreground">
            No projects found
          </div>
        )}

        {filteredProjects.map((project) => {
          const isExpanded = expandedProjects.has(project.id);
          const isActive = isProjectActive(project.slug);

          return (
            <Collapsible
              key={project.id}
              open={isExpanded}
              onOpenChange={() => toggleProject(project.id)}
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    isActive={isActive}
                    className={cn(
                      "group/project",
                      isActive && "bg-sidebar-accent"
                    )}
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <Avatar className="h-5 w-5">
                        {project.logo ? (
                          <AvatarImage src={project.logo} />
                        ) : (
                          <AvatarFallback
                            className="text-[10px]"
                            style={{
                              backgroundColor: project.color || "#6b7280",
                              color: "white",
                            }}
                          >
                            {getProjectInitials(project.name)}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <span className="truncate">{project.name}</span>
                    </div>
                    <ChevronRight
                      className={cn(
                        "h-3.5 w-3.5 transition-transform",
                        isExpanded && "rotate-90"
                      )}
                    />
                  </SidebarMenuButton>
                </CollapsibleTrigger>

                <SidebarMenuAction className="opacity-0 group-hover/project:opacity-100">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="h-5 w-5 flex items-center justify-center hover:bg-sidebar-accent rounded">
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem asChild>
                        <Link
                          href={`/dashboard/projects/${project.slug}/settings`}
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          Project Settings
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive">
                        Archive Project
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </SidebarMenuAction>

                <CollapsibleContent>
                  <SidebarMenuSub>
                    {projectMenuItems.map((item) => (
                      <SidebarMenuSubItem key={item.url}>
                        <SidebarMenuSubButton
                          asChild
                          isActive={isSubItemActive(project.slug, item.url)}
                        >
                          <Link
                            href={`/dashboard/projects/${project.slug}/${item.url}`}
                          >
                            <item.icon className="h-3.5 w-3.5" />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
