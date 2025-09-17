"use client";

import {
  ChevronRight,
  type LucideIcon,
  LayoutDashboard,
  ChartGantt,
  ListTodo,
  KanbanSquare,
  Plus,
} from "lucide-react";
import { useState, useEffect, useMemo, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface Project {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  color?: string;
  status?: string;
}

interface NavItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  isActive?: boolean;
  items?: {
    title: string;
    url: string;
  }[];
}

const projectSubMenuItems = [
  { title: "Dashboard", url: "dashboard", icon: LayoutDashboard },
  { title: "Planning", url: "planning", icon: ChartGantt },
  { title: "Tasks", url: "tasks", icon: ListTodo },
  { title: "Kanban", url: "kanban", icon: KanbanSquare },
];

const RECENT_PROJECTS_KEY = "recent_projects";
const MAX_RECENT_PROJECTS = 10;
const PRELOADED_PROJECTS_KEY = "preloaded_projects";
const PRELOAD_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function NavMain({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [projectsExpanded, setProjectsExpanded] = useState(false);
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(
    null
  );
  const preloadedRef = useRef(false);
  const loadPromiseRef = useRef<Promise<void> | null>(null);

  // Preload projects on component mount
  useEffect(() => {
    if (!preloadedRef.current) {
      preloadedRef.current = true;
      preloadProjects();
    }
  }, []);

  // Track project access when navigating to a project page
  useEffect(() => {
    const parts = pathname.split("/").filter(Boolean);
    const idx = parts.findIndex((seg) => seg === "projects");
    if (idx !== -1 && parts[idx + 1]) {
      const projectSlug = parts[idx + 1];
      const proj = projects.find((p) => p.slug === projectSlug);
      if (proj) {
        setProjectsExpanded(true);
        setExpandedProjectId(proj.id);
        trackProjectAccess(proj);
      }
    }
  }, [pathname, projects]);

  // Preload projects in the background
  const preloadProjects = async () => {
    try {
      // Check if we have cached data that's still fresh
      const cached = localStorage.getItem(PRELOADED_PROJECTS_KEY);
      if (cached) {
        const { timestamp, data } = JSON.parse(cached);
        const age = Date.now() - timestamp;

        if (age < PRELOAD_CACHE_DURATION) {
          // Use cached data if it's fresh
          return;
        }
      }

      // Fetch in the background
      const res = await fetch("/api/companies?limit=10&sort=recent");
      if (res.ok) {
        const data = await res.json();
        const latestProjects: Project[] = data.companies || [];

        // Cache the preloaded data
        localStorage.setItem(
          PRELOADED_PROJECTS_KEY,
          JSON.stringify({
            timestamp: Date.now(),
            data: latestProjects,
          })
        );
      }
    } catch (err) {
      console.error("Failed to preload projects:", err);
    }
  };

  // Track when a project is accessed
  const trackProjectAccess = (project: Project) => {
    try {
      const stored = localStorage.getItem(RECENT_PROJECTS_KEY);
      let recentProjects: Project[] = stored ? JSON.parse(stored) : [];

      // Remove duplicate if exists
      recentProjects = recentProjects.filter((p) => p.id !== project.id);

      // Add to beginning with only necessary data
      const projectData: Project = {
        id: project.id,
        name: project.name,
        slug: project.slug,
        logo: project.logo,
        color: project.color,
      };

      recentProjects.unshift(projectData);

      // Keep only the most recent projects
      recentProjects = recentProjects.slice(0, MAX_RECENT_PROJECTS);

      localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(recentProjects));
    } catch (err) {
      console.error("Failed to track project access:", err);
    }
  };

  // Load projects when expanded (using preloaded data if available)
  useEffect(() => {
    if (projectsExpanded && projects.length === 0) {
      // If already loading, wait for the existing promise
      if (loadPromiseRef.current) {
        loadPromiseRef.current.then(() => {
          // Projects should be loaded now
        });
      } else {
        loadProjects();
      }
    }
  }, [projectsExpanded]);

  const loadProjects = async () => {
    // Prevent duplicate loading
    if (loadPromiseRef.current) return;

    const loadOperation = async () => {
      try {
        setLoadingProjects(true);

        // First, try to load from recent projects
        const stored = localStorage.getItem(RECENT_PROJECTS_KEY);
        const recentProjects: Project[] = stored ? JSON.parse(stored) : [];

        // Then check for preloaded data
        const preloaded = localStorage.getItem(PRELOADED_PROJECTS_KEY);
        let preloadedProjects: Project[] = [];

        if (preloaded) {
          const { data } = JSON.parse(preloaded);
          preloadedProjects = data || [];
        }

        // Merge recent and preloaded
        const projectMap = new Map<string, Project>();

        // Add recent projects first (they have priority)
        recentProjects.forEach((p) => projectMap.set(p.id, p));

        // Add preloaded projects if not already in recent
        preloadedProjects.forEach((p) => {
          if (!projectMap.has(p.id)) {
            projectMap.set(p.id, p);
          }
        });

        // If we have data, use it immediately
        if (projectMap.size > 0) {
          const mergedProjects = Array.from(projectMap.values()).slice(0, 10);
          setProjects(mergedProjects);
          setLoadingProjects(false);
        }

        // Still fetch fresh data in the background for next time
        const res = await fetch("/api/companies?limit=10&sort=recent");
        if (res.ok) {
          const data = await res.json();
          const latestProjects: Project[] = data.companies || [];

          // Update the map with fresh data
          latestProjects.forEach((p) => {
            projectMap.set(p.id, { ...projectMap.get(p.id), ...p });
          });

          // Update displayed projects with fresh data
          const freshProjects = Array.from(projectMap.values()).slice(0, 10);
          setProjects(freshProjects);

          // Update cache for next time
          localStorage.setItem(
            PRELOADED_PROJECTS_KEY,
            JSON.stringify({
              timestamp: Date.now(),
              data: latestProjects,
            })
          );
        }
      } catch (err) {
        console.error("Failed to load projects:", err);
      } finally {
        setLoadingProjects(false);
        loadPromiseRef.current = null;
      }
    };

    loadPromiseRef.current = loadOperation();
    await loadPromiseRef.current;
  };

  const isProjectSubItemActive = (projectSlug: string, itemUrl: string) =>
    pathname === `/dashboard/projects/${projectSlug}/${itemUrl}`;

  const isProjectActive = (projectSlug: string) =>
    pathname.includes(`/dashboard/projects/${projectSlug}`);

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const isProjectsMenu = item.title === "Projecten";
          const hasSubItems =
            (item.items && item.items.length > 0) || isProjectsMenu;

          // For items without subitems (and not the projects menu), render as a direct link
          if (!hasSubItems) {
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild tooltip={item.title}>
                  <Link href={item.url}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          }

          // For items with subitems or the projects menu, render as collapsible
          return (
            <Collapsible
              key={item.title}
              asChild
              defaultOpen={item.isActive}
              className="group/collapsible"
              open={isProjectsMenu ? projectsExpanded : undefined}
              onOpenChange={(open) => {
                if (isProjectsMenu) setProjectsExpanded(open);
              }}
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton tooltip={item.title}>
                    <ChevronRight className="transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    {item.icon && <item.icon />}
                    <span className="flex-1">{item.title}</span>
                  </SidebarMenuButton>
                </CollapsibleTrigger>

                <CollapsibleContent className="mr-0">
                  <SidebarMenuSub className="mr-0">
                    {/* LOADING */}
                    {isProjectsMenu &&
                      loadingProjects &&
                      projects.length === 0 && (
                        <div className="px-2 py-2 space-y-2">
                          {Array.from({ length: 4 }).map((_, i) => (
                            <div
                              key={`skeleton-${i}`}
                              className="flex items-center gap-2"
                            >
                              <Skeleton className="h-5 w-5 rounded" />
                              <Skeleton className="h-3 w-44" />
                            </div>
                          ))}
                        </div>
                      )}

                    {/* PROJECT LIST */}
                    {isProjectsMenu && !loadingProjects && (
                      <>
                        {projects.length === 0 ? (
                          <div className="px-3 py-4 text-center">
                            <p className="text-xs text-muted-foreground mb-2">
                              Nog geen projecten
                            </p>
                            <Button
                              asChild
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Link href="/dashboard/projects/new">
                                <Plus className="h-3.5 w-3.5 mr-1" />
                                Nieuw Project
                              </Link>
                            </Button>
                          </div>
                        ) : (
                          <div className="px-1 py-1">
                            <div className="space-y-1">
                              {projects.map((project) => {
                                const isExpanded =
                                  expandedProjectId === project.id;
                                const isActive = isProjectActive(project.slug);

                                return (
                                  <Collapsible
                                    key={project.id}
                                    open={isExpanded}
                                    className="group/project"
                                  >
                                    <SidebarMenuSubItem>
                                      <div
                                        className={cn(
                                          "flex items-center w-full rounded-md px-0 py-1.5 text-sm transition-colors",
                                          "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                                          isActive &&
                                            "bg-sidebar-accent text-sidebar-accent-foreground"
                                        )}
                                      >
                                        <CollapsibleTrigger
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setExpandedProjectId((prev) =>
                                              prev === project.id
                                                ? null
                                                : project.id
                                            );
                                          }}
                                          className="flex items-center gap-1.5 flex-1"
                                          aria-expanded={isExpanded}
                                        >
                                          <ChevronRight
                                            className={cn(
                                              "h-3.5 w-3.5 transition-transform shrink-0",
                                              isExpanded && "rotate-90"
                                            )}
                                          />
                                          <Avatar className="size-5 shrink-0 ring-1 ring-border">
                                            {project.logo ? (
                                              <AvatarImage
                                                src={project.logo}
                                                alt=""
                                              />
                                            ) : (
                                              <AvatarFallback
                                                className="text-[9px] text-white bg-[#222222] font-semibold"
                                                style={{
                                                  backgroundColor:
                                                    project.color || undefined,
                                                }}
                                              >
                                                {project.name[0]?.toUpperCase() ??
                                                  "P"}
                                              </AvatarFallback>
                                            )}
                                          </Avatar>

                                          <span className="truncate max-w-[150px] text-sm">
                                            {project.name}
                                          </span>
                                        </CollapsibleTrigger>
                                      </div>

                                      <CollapsibleContent>
                                        <div className="ml-4 border-l pl-3 mt-1 mb-2 space-y-1">
                                          {projectSubMenuItems.map((sub) => {
                                            const ItemIcon = sub.icon;
                                            const isSubActive =
                                              isProjectSubItemActive(
                                                project.slug,
                                                sub.url
                                              );
                                            return (
                                              <Link
                                                key={sub.url}
                                                href={`/dashboard/projects/${project.slug}/${sub.url}`}
                                                onClick={() =>
                                                  trackProjectAccess(project)
                                                }
                                                className={cn(
                                                  "flex items-center gap-2 rounded-md px-2 py-1 text-sm transition-colors",
                                                  "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                                                  isSubActive &&
                                                    "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                                                )}
                                              >
                                                <ItemIcon className="size-3.5" />
                                                <span>{sub.title}</span>
                                              </Link>
                                            );
                                          })}
                                        </div>
                                      </CollapsibleContent>
                                    </SidebarMenuSubItem>
                                  </Collapsible>
                                );
                              })}
                            </div>

                            {/* View All Projects Button */}
                            <div className="pt-1">
                              <Button
                                asChild
                                variant="ghost"
                                size="sm"
                                className="h-8 w-full justify-center text-xs font-medium"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Link href="/dashboard/projects">
                                  Bekijk alle projecten
                                </Link>
                              </Button>
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* STATIC ITEMS (original) */}
                    {!isProjectsMenu &&
                      item.items?.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton asChild>
                            <Link href={subItem.url}>
                              <span>{subItem.title}</span>
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
