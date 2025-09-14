"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, UserPlus } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function InviteUserDialog({
  open,
  onOpenChange,
  onSuccess,
}: InviteUserDialogProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("MEMBER");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });

      if (res.ok) {
        onSuccess();
        setEmail("");
        setRole("MEMBER");
        onOpenChange(false);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to send invitation");
      }
    } catch (error) {
      setError("Failed to send invitation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      {/* You can replace this trigger with an "Invite" button elsewhere */}
      <PopoverTrigger asChild>
        <Button className="bg-[#FF6B4A] h-11 rounded-xl hover:bg-[#FF6B4A]/80 text-white">
          <UserPlus className="mr-2 h-4 w-4" />
          Invite Member
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-80 p-4 shadow-none rounded-xl space-y-4"
        align="end"
      >
        <div>
          <p className="font-medium">Invite Team Member</p>
          <p className="text-sm text-muted-foreground">
            Send an invitation to join your organization
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@example.com"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger id="role" className="mt-1">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="PROJECT_MANAGER">Project Manager</SelectItem>
                <SelectItem value="MEMBER">Member</SelectItem>
                <SelectItem value="CLIENT">Client</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              This determines their permissions within the organization.
            </p>
          </div>

          {error && <div className="text-sm text-destructive">{error}</div>}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !email}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send Invitation
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
