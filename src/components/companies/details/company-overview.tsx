"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Mail,
  Phone,
  Globe,
  MapPin,
  Users,
  FileText,
  MessageSquare,
  Activity,
  Building2,
  Calendar,
  Edit2,
  Check,
  X,
  User,
  Clock,
  DollarSign,
  Hash,
  Briefcase,
  TrendingUp,
  MoreVertical,
  Plus,
  ExternalLink,
  Download,
  Paperclip,
  ChevronRight,
  Building,
} from "lucide-react";
import { Timeline } from "@/components/ui/timeline";
import { CompanyAttachments } from "./company-attachments";
import { CompanyContacts } from "./company-contacts";
import { CompanyOverviewNotes } from "./company-overview-notes";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface CompanyOverviewProps {
  company: any;
  onUpdate: () => void;
  session?: any;
}

interface OverviewStats {
  contacts: number;
  notes: number;
  documents: number;
  recentActivities: any[];
}

export function CompanyOverview({
  company,
  onUpdate,
  session,
}: CompanyOverviewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [documents, setDocuments] = useState();
  const [contacts, setContacts] = useState();
  const [notes, setNotes] = useState();
  const [editingField, setEditingField] = useState<string | null>(null);
  const [stats, setStats] = useState<OverviewStats>({
    contacts: 0,
    notes: 0,
    documents: 0,
    recentActivities: [],
  });
  const [formData, setFormData] = useState({
    name: company.name || "",
    email: company.email || "",
    phone: company.phone || "",
    website: company.website || "",
    industry: company.industry || "",
    size: company.size || "",
    annualRevenue: company.annualRevenue || "",
    description: company.description || "",
    address: company.address || {
      street: "",
      city: "",
      state: "",
      postalCode: "",
      country: "",
    },
  });
  const [customFields, setCustomFields] = useState<any[]>([]);
  const [customFieldValues, setCustomFieldValues] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    fetchCustomFields();
    fetchOverviewStats();
  }, []);

  useEffect(() => {
    setCustomFieldValues(company.customFields || {});
    setFormData({
      name: company.name || "",
      email: company.email || "",
      phone: company.phone || "",
      website: company.website || "",
      industry: company.industry || "",
      size: company.size || "",
      annualRevenue: company.annualRevenue || "",
      description: company.description || "",
      address: company.address || {
        street: "",
        city: "",
        state: "",
        postalCode: "",
        country: "",
      },
    });
  }, [company]);

  const fetchCustomFields = async () => {
    try {
      const res = await fetch("/api/custom-fields?entityType=company");
      if (res.ok) {
        const fields = await res.json();
        setCustomFields(fields);
      }
    } catch (error) {
      console.error("Failed to fetch custom fields:", error);
    }
  };

  const fetchOverviewStats = async () => {
    try {
      setLoadingStats(true);
      const [contactsRes, notesRes, docsRes, activitiesRes] = await Promise.all(
        [
          fetch(`/api/companies/${company.id}/contacts`),
          fetch(`/api/companies/${company.id}/notes`),
          fetch(`/api/companies/${company.id}/documents`),
          fetch(`/api/companies/${company.id}/activities?limit=5`),
        ]
      );

      const contacts = await contactsRes.json();
      const notes = await notesRes.json();
      const documents = await docsRes.json();
      const activities = await activitiesRes.json();

      setStats({
        contacts: contacts.length || 0,
        notes: notes.length || 0,
        documents: documents.length || 0,
        recentActivities: activities.activities || [],
      });
      setDocuments(documents);
      setContacts(contacts);
      setNotes(notes);
    } catch (error) {
      console.error("Failed to fetch overview stats:", error);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await fetch(`/api/companies/${company.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          customFields: customFieldValues,
        }),
      });

      if (res.ok) {
        setIsEditing(false);
        setEditingField(null);
        onUpdate();
        fetchOverviewStats();
      }
    } catch (error) {
      console.error("Failed to update company:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: company.name || "",
      email: company.email || "",
      phone: company.phone || "",
      website: company.website || "",
      industry: company.industry || "",
      size: company.size || "",
      annualRevenue: company.annualRevenue || "",
      description: company.description || "",
      address: company.address || {
        street: "",
        city: "",
        state: "",
        postalCode: "",
        country: "",
      },
    });
    setCustomFieldValues(company.customFields || {});
    setIsEditing(false);
    setEditingField(null);
  };

  const formatAddress = (address: any) => {
    if (!address) return null;
    const parts = [
      address.street,
      address.city && address.state
        ? `${address.city}, ${address.state}`
        : address.city || address.state,
      address.postalCode,
      address.country,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : null;
  };

  const renderFieldValue = (
    label: string,
    value: any,
    icon?: any,
    isLink?: boolean,
    href?: string
  ) => {
    const Icon = icon;
    return (
      <div className="group">
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          {label}
        </label>
        <div className="mt-1">
          {isEditing ? (
            <Input
              value={value || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  [label.toLowerCase()]: e.target.value,
                })
              }
              className="h-9 text-sm"
            />
          ) : value ? (
            isLink && href ? (
              <a
                href={href}
                target={href.startsWith("http") ? "_blank" : undefined}
                rel={
                  href.startsWith("http") ? "noopener noreferrer" : undefined
                }
                className="flex items-center gap-2 text-sm text-gray-900 hover:text-blue-600 transition-colors"
              >
                {Icon && <Icon className="w-3.5 h-3.5 text-gray-400" />}
                <span>{value}</span>
                {href.startsWith("http") && (
                  <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </a>
            ) : (
              <div className="flex items-center gap-2 text-sm text-gray-900">
                {Icon && <Icon className="w-3.5 h-3.5 text-gray-400" />}
                <span>{value}</span>
              </div>
            )
          ) : (
            <span className="text-sm text-gray-400">Not provided</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "oklch(0.94 0 0)" }}
    >
      {/* Main Content */}
      <div className="p-6">
        <div className="grid grid-cols-12 gap-4">
          {/* Left Column - Main Details */}
          <div className="col-span-8 space-y-4">
            <div className="bg-white rounded-xl p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl"
                    style={{ backgroundColor: company.color || "#1F1F1F" }}
                  >
                    {formData.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-0.5">
                      {formData.name}
                    </h1>
                    <div className="flex items-center gap-3">
                      {company.industry && (
                        <div className="flex items-center text-xs">
                          <Briefcase className="w-3 h-3 mr-1" />
                          {company.industry}
                        </div>
                      )}
                      <span>•</span>
                      {company.size && (
                        <div className="flex items-center text-xs">
                          <Users className="w-3 h-3 mr-1" />
                          {company.size}
                        </div>
                      )}
                      <span>•</span>
                      {company.annualRevenue && (
                        <div className="flex items-center text-xs">
                          <DollarSign className="w-3 h-3 mr-1" />
                          {company.annualRevenue}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!isEditing ? (
                    <Button
                      onClick={() => setIsEditing(true)}
                      variant="outline"
                      className="h-9"
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  ) : (
                    <>
                      <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="h-9 bg-blue-600 hover:bg-blue-700"
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Save
                      </Button>
                      <Button
                        onClick={handleCancel}
                        variant="outline"
                        className="h-9"
                      >
                        Cancel
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-gray-100 rounded-lg p-3 border border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-white">
                      <Users className="w-3.5 h-3.5 text-[#FF6B4A]" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold">{stats.contacts}</p>
                      <p className="text-xs text-gray-500">Contacts</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-100 rounded-lg p-3 border border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-white">
                      <MessageSquare className="w-3.5 h-3.5 text-[#FF6B4A]" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold">{stats.notes}</p>
                      <p className="text-xs text-gray-500">Notes</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-100 rounded-lg p-3 border border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-white">
                      <FileText className="w-3.5 h-3.5 text-[#FF6B4A]" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold">{stats.documents}</p>
                      <p className="text-xs text-gray-500">Documents</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-100 rounded-lg p-3 border border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-white">
                      <Activity className="w-3.5 h-3.5 text-[#FF6B4A]" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold">
                        {stats.recentActivities.length}
                      </p>
                      <p className="text-xs text-gray-500">Activities</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-white rounded-xl p-6">
              <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
                Contact Information
              </h2>
              <div className="grid grid-cols-2 gap-6">
                {renderFieldValue(
                  "Email",
                  formData.email,
                  Mail,
                  true,
                  `mailto:${formData.email}`
                )}
                {renderFieldValue(
                  "Phone",
                  formData.phone,
                  Phone,
                  true,
                  `tel:${formData.phone}`
                )}
                {renderFieldValue(
                  "Website",
                  formData.website?.replace(/^https?:\/\//, ""),
                  Globe,
                  true,
                  formData.website
                )}
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Address
                  </label>
                  <div className="mt-1">
                    {isEditing ? (
                      <div className="space-y-2">
                        <Input
                          placeholder="Street"
                          value={formData.address?.street || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              address: {
                                ...formData.address,
                                street: e.target.value,
                              },
                            })
                          }
                          className="h-9 text-sm"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            placeholder="City"
                            value={formData.address?.city || ""}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                address: {
                                  ...formData.address,
                                  city: e.target.value,
                                },
                              })
                            }
                            className="h-9 text-sm"
                          />
                          <Input
                            placeholder="State"
                            value={formData.address?.state || ""}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                address: {
                                  ...formData.address,
                                  state: e.target.value,
                                },
                              })
                            }
                            className="h-9 text-sm"
                          />
                        </div>
                      </div>
                    ) : formatAddress(formData.address) ? (
                      <div className="flex items-start gap-2 text-sm text-gray-900">
                        <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5" />
                        <span>{formatAddress(formData.address)}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">
                        Not provided
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Business Details */}
            <div className="bg-white rounded-xl p-6">
              <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
                Business Details
              </h2>
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Industry
                  </label>
                  <div className="mt-1">
                    {isEditing ? (
                      <Input
                        value={formData.industry || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, industry: e.target.value })
                        }
                        className="h-9 text-sm"
                      />
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-gray-900">
                        <Briefcase className="w-3.5 h-3.5 text-gray-400" />
                        <span>{formData.industry || "Not specified"}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Company Size
                  </label>
                  <div className="mt-1">
                    {isEditing ? (
                      <Select
                        value={formData.size}
                        onValueChange={(value) =>
                          setFormData({ ...formData, size: value })
                        }
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Select size" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1-10">1-10 employees</SelectItem>
                          <SelectItem value="11-50">11-50 employees</SelectItem>
                          <SelectItem value="51-200">
                            51-200 employees
                          </SelectItem>
                          <SelectItem value="201-500">
                            201-500 employees
                          </SelectItem>
                          <SelectItem value="501-1000">
                            501-1000 employees
                          </SelectItem>
                          <SelectItem value="1000+">1000+ employees</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-gray-900">
                        <Users className="w-3.5 h-3.5 text-gray-400" />
                        <span>{formData.size || "Not specified"}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Annual Revenue
                  </label>
                  <div className="mt-1">
                    {isEditing ? (
                      <Input
                        value={formData.annualRevenue || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            annualRevenue: e.target.value,
                          })
                        }
                        placeholder="e.g., $1M - $5M"
                        className="h-9 text-sm"
                      />
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-gray-900">
                        <DollarSign className="w-3.5 h-3.5 text-gray-400" />
                        <span>{formData.annualRevenue || "Not specified"}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {formData.description && (
                <div className="mt-6">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </label>
                  <div className="mt-2">
                    {isEditing ? (
                      <Textarea
                        value={formData.description}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            description: e.target.value,
                          })
                        }
                        rows={3}
                        className="text-sm"
                      />
                    ) : (
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {formData.description}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Custom Fields */}
            {customFields.length > 0 && (
              <div className="bg-white rounded-xl p-6">
                <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
                  Additional Information
                </h2>
                <div className="grid grid-cols-2 gap-6">
                  {customFields.map((field) => (
                    <div key={field.id}>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {field.fieldLabel}
                      </label>
                      <div className="mt-1">
                        {isEditing ? (
                          field.fieldType === "textarea" ? (
                            <Textarea
                              value={customFieldValues[field.fieldKey] || ""}
                              onChange={(e) =>
                                setCustomFieldValues({
                                  ...customFieldValues,
                                  [field.fieldKey]: e.target.value,
                                })
                              }
                              rows={2}
                              className="text-sm"
                            />
                          ) : field.fieldType === "select" ? (
                            <Select
                              value={customFieldValues[field.fieldKey] || ""}
                              onValueChange={(value) =>
                                setCustomFieldValues({
                                  ...customFieldValues,
                                  [field.fieldKey]: value,
                                })
                              }
                            >
                              <SelectTrigger className="h-9 text-sm">
                                <SelectValue
                                  placeholder={`Select ${field.fieldLabel}`}
                                />
                              </SelectTrigger>
                              <SelectContent>
                                {field.options?.map((option: string) => (
                                  <SelectItem key={option} value={option}>
                                    {option}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              value={customFieldValues[field.fieldKey] || ""}
                              onChange={(e) =>
                                setCustomFieldValues({
                                  ...customFieldValues,
                                  [field.fieldKey]: e.target.value,
                                })
                              }
                              className="h-9 text-sm"
                            />
                          )
                        ) : (
                          <span className="text-sm text-gray-900">
                            {customFieldValues[field.fieldKey] || (
                              <span className="text-gray-400">
                                Not specified
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Attachments Section */}
            <div className="bg-white rounded-xl">
              <CompanyAttachments
                companyId={company?.id}
                attachments={documents}
              />
            </div>

            {/* Notes Section */}
            <div className="bg-white rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                  Notes
                </h2>
                <Button variant="outline" size="sm" className="h-8">
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Add Note
                </Button>
              </div>
              <CompanyOverviewNotes
                companyId={company?.id}
                notes={notes}
                onUpdate={fetchOverviewStats}
                currentUserId={session?.userId}
                userRole={session?.role}
              />
            </div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="col-span-4 space-y-4">
            {/* System Information */}
            <div className="bg-white rounded-xl p-6">
              <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
                System Information
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Organization ID
                  </label>
                  <div className="mt-1 flex items-center gap-2">
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                      {company.organizationId}
                    </code>
                    <button
                      onClick={() =>
                        navigator.clipboard.writeText(company.organizationId)
                      }
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <Hash className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Company ID
                  </label>
                  <div className="mt-1 flex items-center gap-2">
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                      {company.id}
                    </code>
                    <button
                      onClick={() => navigator.clipboard.writeText(company.id)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <Hash className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </label>
                  <div className="mt-1 text-sm text-gray-900">
                    {new Date(company.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Updated
                  </label>
                  <div className="mt-1 text-sm text-gray-900">
                    {new Date(company.updatedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Contacts */}
            <div className="bg-white rounded-xl p-6">
              {/* <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                  Contacts ({stats.contacts})
                </h2>
                <Button variant="ghost" size="sm" className="h-7 text-xs">
                  View All
                  <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </div> */}
              <CompanyContacts
                contacts={contacts || []}
                companyId={company?.id}
                onViewAll={() => console.log("View all contacts")}
              />
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                  Recent Activity
                </h2>
                <Button variant="ghost" size="sm" className="h-7 text-xs">
                  View All
                  <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
              <Timeline events={stats.recentActivities} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
