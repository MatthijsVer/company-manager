"use client";
import { useState, useEffect } from "react";
import { ChevronsUpDown, Timer } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { TimeTrackerPopover } from "./time-tracker/time-tracker";
import { UserMenuSidebar } from "./nav-user/user-menu-sidebar";
import { ProfileContent } from "./nav-user/profile-content";
import { GeneralContent } from "./nav-user/general-content";
import { SecurityContent } from "./nav-user/security-content";
import { NotificationsContent } from "./nav-user/notifications-content";
import type { User } from "@/types/nav-user";

export function NavUser({ user: initialUser }: { user: User }) {
  const { isMobile } = useSidebar();
  const [activeContent, setActiveContent] = useState("profile");
  const [openUserMenu, setOpenUserMenu] = useState(false);
  const [openTimer, setOpenTimer] = useState(false);
  const [user, setUser] = useState(initialUser);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const res = await fetch("/api/user/profile");
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      }
    } catch (error) {
      console.error("Failed to fetch user profile:", error);
    }
  };

  const renderContent = () => {
    switch (activeContent) {
      case "profile":
        return <ProfileContent user={user} />;
      case "general":
        return <GeneralContent />;
      case "security":
        return <SecurityContent user={user} setUser={setUser} />;
      case "notifications":
        return <NotificationsContent />;
      default:
        return <ProfileContent user={user} />;
    }
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <div className="relative">
          {/* Timer Button */}
          <div className="absolute right-12 top-1/2 -translate-y-1/2 z-10">
            <TimeTrackerPopover open={openTimer} onOpenChange={setOpenTimer}>
              <button
                className="size-7 rounded-full bg-transparent hover:bg-black/10 transition text-black cursor-pointer flex items-center justify-center"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenTimer(!openTimer);
                }}
              >
                <Timer className="size-4" />
              </button>
            </TimeTrackerPopover>
          </div>

          {/* User Dropdown */}
          <DropdownMenu open={openUserMenu} onOpenChange={setOpenUserMenu}>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent outline-none bg-white rounded-full border pr-4 data-[state=open]:text-sidebar-accent-foreground w-full"
              >
                <Avatar className="size-9 -ml-0.5 rounded-full">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg">
                    {user.name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
                <div className="w-7 h-7" />
                <ChevronsUpDown className="ml-auto size-4" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) p-0 shadow-none flex flex-col min-w-152 h-90 ml-3 mb-1 rounded-2xl"
              side={isMobile ? "bottom" : "top"}
              align="end"
              sideOffset={4}
            >
              <div className="flex items-start">
                <UserMenuSidebar
                  activeContent={activeContent}
                  onMenuItemClick={setActiveContent}
                />
                {renderContent()}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
