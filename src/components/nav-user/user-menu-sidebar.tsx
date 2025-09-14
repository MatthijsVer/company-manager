"use client";
import { useState } from "react";
import {
  Boxes,
  Fingerprint,
  Loader2,
  LogOutIcon,
  UserCircle,
  Zap,
} from "lucide-react";
import {
  DropdownMenuGroup,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

interface UserMenuSidebarProps {
  activeContent: string;
  onMenuItemClick: (item: string) => void;
}

export function UserMenuSidebar({
  activeContent,
  onMenuItemClick,
}: UserMenuSidebarProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });

      if (res.ok) {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = "/auth/login";
      } else {
        console.error("Logout failed");
        setIsLoggingOut(false);
      }
    } catch (error) {
      console.error("Logout error:", error);
      setIsLoggingOut(false);
    }
  };

  const menuItems = [
    { id: "general", icon: Boxes, label: "Algemeen" },
    { id: "profile", icon: UserCircle, label: "Profiel" },
    { id: "security", icon: Fingerprint, label: "Beveiliging" },
    { id: "notifications", icon: Zap, label: "Notificaties" },
  ];

  return (
    <div className="border-r h-full top-0 flex flex-col min-w-40 absolute p-3">
      <DropdownMenuGroup className="w-full h-full flex flex-col gap-2">
        {menuItems.map((item) => (
          <DropdownMenuItem
            key={item.id}
            className="font-medium w-full text-[13px] mr-2"
            onSelect={(event) => {
              event.preventDefault();
              onMenuItemClick(item.id);
            }}
          >
            <item.icon />
            {item.label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuItem
          className="font-medium w-full mt-auto text-[13px] mr-2"
          onSelect={handleLogout}
          disabled={isLoggingOut}
        >
          {isLoggingOut ? (
            <>
              <Loader2 className="animate-spin" />
              Uitloggen...
            </>
          ) : (
            <>
              <LogOutIcon />
              Uitloggen
            </>
          )}
        </DropdownMenuItem>
      </DropdownMenuGroup>
    </div>
  );
}
