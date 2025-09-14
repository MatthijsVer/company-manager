import { useState, useEffect } from "react";
import {
  MessageSquare,
  Plus,
  Edit2,
  Trash2,
  Pin,
  MoreVertical,
  User,
  Calendar,
  Tag,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { formatDistanceToNow } from "date-fns";

interface Note {
  id: string;
  companyId: string;
  userId: string;
  content: string;
  category?: string | null;
  isPinned?: boolean;
  createdAt: string;
  updatedAt: string;
  user: {
    name: string;
    email: string;
    image?: string;
  };
}

interface CompanyNotesProps {
  companyId: string;
  notes?: Note[];
  onUpdate?: () => void;
  currentUserId?: string;
  userRole?: string;
}

export function CompanyOverviewNotes({
  companyId,
  notes: initialNotes,
  onUpdate,
  currentUserId,
  userRole,
}: CompanyNotesProps) {
  const [notes, setNotes] = useState<Note[]>(initialNotes || []);
  const [loading, setLoading] = useState(!initialNotes);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState<{ [key: string]: string }>({});
  const [saving, setSaving] = useState(false);

  // Form state
  const [noteContent, setNoteContent] = useState("");
  const [noteCategory, setNoteCategory] = useState<string>("");

  // Note categories
  const categories = [
    {
      value: "general",
      label: "General",
      color: "bg-gray-500/10 text-gray-600",
    },
    {
      value: "meeting",
      label: "Meeting",
      color: "bg-blue-500/10 text-blue-600",
    },
    { value: "call", label: "Call", color: "bg-green-500/10 text-green-600" },
    {
      value: "email",
      label: "Email",
      color: "bg-purple-500/10 text-purple-600",
    },
    { value: "task", label: "Task", color: "bg-orange-500/10 text-orange-600" },
    {
      value: "important",
      label: "Important",
      color: "bg-red-500/10 text-red-600",
    },
  ];

  useEffect(() => {
    if (!initialNotes) {
      fetchNotes();
    }
  }, [companyId]);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/companies/${companyId}/notes`);
      if (res.ok) {
        const data = await res.json();
        setNotes(data);
      }
    } catch (error) {
      console.error("Failed to fetch notes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!noteContent.trim()) {
      return;
    }

    try {
      setSaving(true);
      const res = await fetch(`/api/companies/${companyId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: noteContent,
          category: noteCategory || null,
        }),
      });

      if (res.ok) {
        const newNote = await res.json();
        setNotes((prev) => [newNote, ...prev]);
        setNoteContent("");
        setNoteCategory("");
        setIsAddingNote(false);
        onUpdate?.();
      } else {
        throw new Error("Failed to add note");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateNote = async (noteId: string, content: string) => {
    try {
      setSaving(true);
      const res = await fetch(`/api/companies/${companyId}/notes/${noteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (res.ok) {
        const updatedNote = await res.json();
        setNotes((prev) =>
          prev.map((note) => (note.id === noteId ? updatedNote : note))
        );
        setEditingNoteId(null);
        setEditContent((prev) => {
          const { [noteId]: removed, ...rest } = prev;
          return rest;
        });
        onUpdate?.();
      } else {
        throw new Error("Failed to update note");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handlePinNote = async (noteId: string, isPinned: boolean) => {
    try {
      const res = await fetch(`/api/companies/${companyId}/notes/${noteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPinned: !isPinned }),
      });

      if (res.ok) {
        const updatedNote = await res.json();
        setNotes((prev) =>
          prev.map((note) => (note.id === noteId ? updatedNote : note))
        );
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm("Are you sure you want to delete this note?")) return;

    try {
      const res = await fetch(`/api/companies/${companyId}/notes/${noteId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setNotes((prev) => prev.filter((note) => note.id !== noteId));
        onUpdate?.();
      } else {
        throw new Error("Failed to delete note");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getCategoryStyle = (category: string | null | undefined) => {
    const cat = categories.find((c) => c.value === category);
    return cat?.color || "bg-gray-500/10 text-gray-600";
  };

  const canEditNote = (note: Note) => {
    return (
      note.userId === currentUserId ||
      userRole === "ADMIN" ||
      userRole === "OWNER"
    );
  };

  if (loading) {
    return (
      <div className="bg-card rounded-xl p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-muted rounded w-32 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl">
      {/* Header */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            Notes
            <Badge variant="secondary" className="ml-1">
              {notes.length}
            </Badge>
          </h3>
          {!isAddingNote && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddingNote(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Note
            </Button>
          )}
        </div>

        {/* Add Note Form */}
        {isAddingNote && (
          <div className="space-y-3 p-4 flex flex-col items-end justify-end rounded-lg">
            <div>
              <Label className="text-xs mb-2">Category</Label>
              <Select value={noteCategory} onValueChange={setNoteCategory}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select category (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${cat.color}`} />
                        {cat.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Textarea
              placeholder="Write your note here..."
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              className="min-h-[100px]"
              autoFocus
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleAddNote}
                disabled={saving || !noteContent.trim()}
              >
                <Check className="h-4 w-4 mr-1" />
                Save Note
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsAddingNote(false);
                  setNoteContent("");
                  setNoteCategory("");
                }}
                disabled={saving}
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Notes List */}
      <div className="px-6 pb-6">
        {notes.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No notes yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add a note to keep track of important information
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => {
              const isEditing = editingNoteId === note.id;
              const currentEditContent = editContent[note.id] || note.content;

              return (
                <div
                  key={note.id}
                  className={`relative ${
                    note.isPinned
                      ? "bg-amber-50/50 border-amber-200 dark:bg-amber-950/20"
                      : "bg-background"
                  } group`}
                >
                  {/* Note Header */}
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-start gap-3">
                      <Avatar className="size-9">
                        {note.user.image ? (
                          <AvatarImage src={note.user.image} />
                        ) : (
                          <AvatarFallback className="text-xs">
                            {getInitials(note.user.name)}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{note.user.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(note.createdAt), {
                            addSuffix: true,
                          })}
                          {note.updatedAt !== note.createdAt && (
                            <span className="text-xs">(edited)</span>
                          )}
                        </div>
                        {/* Note Content */}
                        {isEditing ? (
                          <div className="space-y-2">
                            <Textarea
                              value={currentEditContent}
                              onChange={(e) =>
                                setEditContent((prev) => ({
                                  ...prev,
                                  [note.id]: e.target.value,
                                }))
                              }
                              className="min-h-[100px]"
                              autoFocus
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() =>
                                  handleUpdateNote(note.id, currentEditContent)
                                }
                                disabled={saving}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingNoteId(null);
                                  setEditContent((prev) => {
                                    const { [note.id]: removed, ...rest } =
                                      prev;
                                    return rest;
                                  });
                                }}
                                disabled={saving}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col w-full">
                            <p className="w-fit rounded-lg rounded-tl-sm mt-3 text-[13px] whitespace-pre-wrap">
                              {note.content}
                            </p>
                            <div className="flex items-center mt-1">
                              <Button
                                variant={"ghost"}
                                className="px-[3px]"
                                onClick={() =>
                                  handlePinNote(note.id, note.isPinned || false)
                                }
                              >
                                <Pin className="size-3.5" />
                              </Button>
                              <Button
                                variant={"ghost"}
                                className="px-[3px]"
                                onClick={() => {
                                  setEditingNoteId(note.id);
                                  setEditContent((prev) => ({
                                    ...prev,
                                    [note.id]: note.content,
                                  }));
                                }}
                              >
                                <Edit2 className="size-3.5" />
                              </Button>
                              <Button
                                variant={"ghost"}
                                onClick={() => handleDeleteNote(note.id)}
                                className="px-[3px]"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {note.isPinned && (
                        <Pin className="h-4 w-4 text-amber-600 fill-amber-600" />
                      )}
                      {note.category && (
                        <Badge
                          variant="secondary"
                          className={`text-xs ${getCategoryStyle(note.category)}`}
                        >
                          {
                            categories.find((c) => c.value === note.category)
                              ?.label
                          }
                        </Badge>
                      )}
                      {/* {canEditNote(note) && ( */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() =>
                              handlePinNote(note.id, note.isPinned || false)
                            }
                          >
                            <Pin className="h-4 w-4 mr-2" />
                            {note.isPinned ? "Unpin" : "Pin"} Note
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingNoteId(note.id);
                              setEditContent((prev) => ({
                                ...prev,
                                [note.id]: note.content,
                              }));
                            }}
                          >
                            <Edit2 className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteNote(note.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      {/* )} */}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
