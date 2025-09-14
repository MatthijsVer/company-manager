"use client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { User } from "@/types/nav-user";

interface ProfileContentProps {
  user: User;
}

export function ProfileContent({ user }: ProfileContentProps) {
  return (
    <div className="flex-1 flex flex-col pl-40">
      <div className="border-b py-3.5 px-6 w-full">
        <h2 className="text-lg">Profiel</h2>
      </div>
      <div className="border-b py-3.5 flex items-center justify-between px-6 w-full">
        <div className="flex flex-col">
          <p className="text-sm font-medium">Profielafbeelding</p>
          <p className="text-[12px] mt-1 text-[#919191]">
            800x800 px (png/jpg)
          </p>
        </div>
        <Avatar className="size-11">
          <AvatarImage src={user.avatar} />
          <AvatarFallback>{user.name?.charAt(0) || "U"}</AvatarFallback>
        </Avatar>
      </div>
      <ProfileField label="Naam" value={user.name} />
      <ProfileField label="Email" value={user.email} />
      <ProfileField
        label="Telefoonnummer"
        value={user.phone || "+316 41 41 41 41"}
      />
      <div className="flex flex-col w-full py-3.5 gap-2">
        <ProfileField label="Straat + Huisnummer" value="Berg Enk 19" />
        <ProfileField label="Postcode" value="3825 PH" />
        <ProfileField label="Plaats" value="Amersfoort" />
        <ProfileField label="Land" value="Nederland" />
      </div>
    </div>
  );
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b py-3.5 flex items-center justify-between px-6 w-full">
      <p className="text-sm">{label}</p>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
