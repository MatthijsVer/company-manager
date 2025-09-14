"use client";

import * as React from "react";
import {
  AudioWaveform,
  BookOpen,
  Bot,
  Braces,
  ChartGantt,
  Code,
  Command,
  Folder,
  Frame,
  GalleryVerticalEnd,
  Gauge,
  IdCardLanyard,
  Map,
  Mic,
  PieChart,
  Settings2,
  SquareTerminal,
  Tag,
  TicketsPlane,
} from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavProjects } from "@/components/nav-projects";
import { NavUser } from "@/components/nav-user";
import { TeamSwitcher } from "@/components/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";

// This is sample data.
const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  teams: [
    {
      name: "Acme Inc",
      logo: GalleryVerticalEnd,
      plan: "Enterprise",
    },
    {
      name: "Acme Corp.",
      logo: AudioWaveform,
      plan: "Startup",
    },
    {
      name: "Evil Corp.",
      logo: Command,
      plan: "Free",
    },
  ],
  navMain: [
    {
      title: "Dashboard",
      url: "/",
      icon: Gauge,
      isActive: true,
    },
    {
      title: "Projecten",
      url: "/dashboard/projects",
      icon: Tag,
    },
    {
      title: "Planning",
      url: "#",
      icon: ChartGantt,
      items: [
        {
          title: "Introduction",
          url: "#",
        },
        {
          title: "Get Started",
          url: "#",
        },
        {
          title: "Tutorials",
          url: "#",
        },
        {
          title: "Changelog",
          url: "#",
        },
      ],
    },
    {
      title: "Documenten",
      url: "#",
      icon: BookOpen,
      items: [
        {
          title: "General",
          url: "#",
        },
        {
          title: "Team",
          url: "#",
        },
        {
          title: "Billing",
          url: "#",
        },
        {
          title: "Limits",
          url: "#",
        },
      ],
    },
  ],
  projects: [
    {
      name: "Team",
      url: "/dashboard/users",
      icon: IdCardLanyard,
    },
    {
      name: "Documents",
      url: "/dashboard/documents",
      icon: Folder,
    },
    {
      name: "Verlof",
      url: "#",
      icon: TicketsPlane,
    },
    {
      name: "Code",
      url: "#",
      icon: Braces,
    },
    {
      name: "Transciptie",
      url: "/dashboard/meetings",
      icon: Mic,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
