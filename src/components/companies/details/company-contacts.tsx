import { useState } from "react";
import {
  User,
  Mail,
  Phone,
  Building2,
  Crown,
  Users,
  ChevronDown,
  ChevronUp,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  MoreVertical,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface Contact {
  id: string;
  companyId: string;
  name: string;
  email?: string;
  phone?: string;
  title?: string;
  department?: string;
  isPrimary?: boolean;
  notes?: string;
  lastContactAt?: string | null;
  createdAt: string;
  updatedAt: string;
  metadata?: any;
}

interface CompanyContactsProps {
  contacts: Contact[];
  companyId: string;
  onContactsUpdate: () => void;
}

export function CompanyContacts({
  contacts,
  companyId,
  onContactsUpdate,
}: CompanyContactsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [deleteContactId, setDeleteContactId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state for add/edit
  const [formData, setFormData] = useState({
    name: "",
    title: "",
    email: "",
    phone: "",
    department: "",
    notes: "",
    isPrimary: false,
  });

  // Show 3 contacts when collapsed, all when expanded
  const displayContacts = isExpanded ? contacts : contacts?.slice(0, 3) || [];
  const hasMore = contacts?.length > 3;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleAddContact = () => {
    setFormData({
      name: "",
      title: "",
      email: "",
      phone: "",
      department: "",
      notes: "",
      isPrimary: false,
    });
    setIsAddingContact(true);
    setIsExpanded(true);
  };

  const handleEditContact = (contact: Contact) => {
    setFormData({
      name: contact.name,
      title: contact.title || "",
      email: contact.email || "",
      phone: contact.phone || "",
      department: contact.department || "",
      notes: contact.notes || "",
      isPrimary: contact.isPrimary || false,
    });
    setEditingContactId(contact.id);
  };

  const handleSaveContact = async () => {
    if (!formData.name.trim()) {
      return;
    }

    try {
      setSaving(true);

      if (editingContactId) {
        // Update existing contact
        const res = await fetch(
          `/api/companies/${companyId}/contacts/${editingContactId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData),
          }
        );

        if (res.ok) {
          setEditingContactId(null);
          onContactsUpdate();
        } else {
          throw new Error("Failed to update contact");
        }
      } else {
        // Create new contact
        const res = await fetch(`/api/companies/${companyId}/contacts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        if (res.ok) {
          setIsAddingContact(false);
          onContactsUpdate();
        } else {
          throw new Error("Failed to add contact");
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteContact = async () => {
    if (!deleteContactId) return;

    try {
      setSaving(true);
      const res = await fetch(
        `/api/companies/${companyId}/contacts/${deleteContactId}`,
        {
          method: "DELETE",
        }
      );

      if (res.ok) {
        setDeleteContactId(null);
        onContactsUpdate();
      } else {
        throw new Error("Failed to delete contact");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsAddingContact(false);
    setEditingContactId(null);
    setFormData({
      name: "",
      title: "",
      email: "",
      phone: "",
      department: "",
      notes: "",
      isPrimary: false,
    });
  };

  if (!contacts || contacts.length === 0) {
    return (
      <div className="">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Contacts</h3>
          <Button
            size="sm"
            variant="outline"
            onClick={handleAddContact}
            className="h-7 px-2"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add
          </Button>
        </div>
        {isAddingContact ? (
          <ContactForm />
        ) : (
          <div className="text-center py-6">
            <Users className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No contacts yet</p>
          </div>
        )}
      </div>
    );
  }

  const ContactForm = () => (
    <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
      <div className="space-y-2">
        <div>
          <Label className="text-xs">Name *</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Contact name"
            className="h-8 text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Title</Label>
            <Input
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder="Job title"
              className="h-8 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs">Department</Label>
            <Input
              value={formData.department}
              onChange={(e) =>
                setFormData({ ...formData, department: e.target.value })
              }
              placeholder="Department"
              className="h-8 text-sm"
            />
          </div>
        </div>
        <div>
          <Label className="text-xs">Email</Label>
          <Input
            type="email"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            placeholder="email@example.com"
            className="h-8 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs">Phone</Label>
          <Input
            type="tel"
            value={formData.phone}
            onChange={(e) =>
              setFormData({ ...formData, phone: e.target.value })
            }
            placeholder="+1 (555) 000-0000"
            className="h-8 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs">Notes</Label>
          <Textarea
            value={formData.notes}
            onChange={(e) =>
              setFormData({ ...formData, notes: e.target.value })
            }
            placeholder="Additional notes..."
            className="min-h-[60px] text-sm"
          />
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="primary"
            checked={formData.isPrimary}
            onCheckedChange={(checked) =>
              setFormData({ ...formData, isPrimary: checked })
            }
          />
          <Label htmlFor="primary" className="text-xs">
            Set as primary contact
          </Label>
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <Button
          size="sm"
          onClick={handleSaveContact}
          disabled={saving || !formData.name.trim()}
          className="h-7"
        >
          <Check className="h-3 w-3 mr-1" />
          Save
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleCancel}
          disabled={saving}
          className="h-7"
        >
          <X className="h-3 w-3 mr-1" />
          Cancel
        </Button>
      </div>
    </div>
  );

  const ContactItem = ({ contact }: { contact: Contact }) => {
    const isEditing = editingContactId === contact.id;

    if (isEditing) {
      return <ContactForm />;
    }

    return (
      <div className="flex gap-2.5 items-center group">
        {/* Avatar */}
        <Avatar className="h-9 w-9 shrink-0">
          <AvatarFallback className="text-xs bg-primary/10">
            {getInitials(contact.name)}
          </AvatarFallback>
        </Avatar>

        {/* Contact Info */}
        <div className="flex-1 min-w-0 space-y-1">
          {/* Name and Primary Badge */}
          <div className="flex items-center gap-1 mb-0">
            <p className="text-sm font-medium truncate">{contact.name}</p>
            {contact.isPrimary && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Crown className="h-3 w-3 text-yellow-600 shrink-0" />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p className="text-xs">Primary Contact</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* Quick Actions */}
            <div className="flex gap-1 ml-auto">
              {contact.email && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <a
                        href={`mailto:${contact.email}`}
                        className="inline-flex items-center justify-center h-6 w-6 rounded-md bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Mail className="h-3 w-3" />
                      </a>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">{contact.email}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {contact.phone && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <a
                        href={`tel:${contact.phone}`}
                        className="inline-flex items-center justify-center h-6 w-6 rounded-md bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Phone className="h-3 w-3" />
                      </a>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">{contact.phone}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {contact.department && (
                <Badge
                  variant="outline"
                  className="h-5 px-1.5 bg-[#1F1F1F] text-white border-[#1F1F1F] text-[10px]"
                >
                  {contact.department}
                </Badge>
              )}

              {/* More Actions Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-32">
                  <DropdownMenuItem onClick={() => handleEditContact(contact)}>
                    <Edit2 className="h-3 w-3 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setDeleteContactId(contact.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-3 w-3 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Title/Department */}
          <div className="flex items-center gap-2">
            {contact.title && (
              <p className="text-xs text-muted-foreground truncate">
                {contact.title}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
            Contacts
            <Badge
              variant="secondary"
              className="ml-2 font-normal text-white bg-[#1F1F1F]"
            >
              {contacts.length}
            </Badge>
          </h2>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleAddContact}
            className="h-7 px-2 text-[13px]"
          >
            <Plus className="size-4" />
            Add
          </Button>
        </div>

        <div className="relative">
          {/* Add new contact form */}
          {isAddingContact && (
            <div className="mb-3">
              <ContactForm />
            </div>
          )}

          {/* Collapsed view - first 3 contacts */}
          {!isExpanded && !isAddingContact && (
            <div className="space-y-3">
              {displayContacts.map((contact) => (
                <ContactItem key={contact.id} contact={contact} />
              ))}
            </div>
          )}

          {/* Expanded view - all contacts with scroll */}
          {isExpanded && (
            <div className="animate-in slide-in-from-top-2 duration-200">
              <ScrollArea className="max-h-[400px] pr-3">
                <div className="space-y-2">
                  {contacts.map((contact) => (
                    <ContactItem key={contact.id} contact={contact} />
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Show more/less button */}
          {hasMore && !isAddingContact && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className={cn(
                "w-full mt-3 h-8 text-xs text-muted-foreground hover:text-foreground",
                "flex items-center justify-center gap-1 transition-all duration-200"
              )}
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-3 w-3" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3" />
                  Show {contacts.length - 3} more{" "}
                  {contacts.length - 3 === 1 ? "contact" : "contacts"}
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteContactId}
        onOpenChange={() => setDeleteContactId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Contact</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this contact? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteContactId(null)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteContact}
              disabled={saving}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
