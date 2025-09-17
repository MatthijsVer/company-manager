// https://interly.nl/wp-content/uploads/2024/07/IMG_6414-scaled.jpeg

import { MoreHorizontal, TreePalm, UserCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

export default function UserOverview() {
  return (
    <div className="col-span-2 relative p-4 rounded-3xl border-none bg-white">
      <div className="rounded-2xl h-18 overflow-hidden">
        <img alt="user background" src="/company-banner.png" />
      </div>
      <div className="flex items-start -mt-10 pl-4 justify-between mb-2.5">
        <div className="relative">
          <Avatar className="size-20 ring-2 ring-white">
            <AvatarImage
              className="object-cover"
              src="https://interly.nl/wp-content/uploads/2024/07/IMG_6414-scaled.jpeg"
            />
            <AvatarFallback className="bg-[#222222] text-white font-semibold">
              MA
            </AvatarFallback>
          </Avatar>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 absolute top-5 right-6 transition-opacity"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem className="cursor-pointer">
              <UserCheck className="h-3 w-3 mr-2" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer">
              <TreePalm className="h-3 w-3 mr-2" />
              Request time off
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="space-y-1 mb-4 pl-1">
        <p className="font-semibold text-gray-900">Matthijs Verhoef</p>
        <p className="text-sm text-gray-500 truncate">
          matthijsverhoef@live.nl
        </p>
      </div>
    </div>
  );
}
