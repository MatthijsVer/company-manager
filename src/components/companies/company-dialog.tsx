"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

// Match the API schema exactly
const companySchema = z.object({
  name: z.string().min(1, "Company name is required").max(255),
  slug: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  address: z
    .object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      country: z.string().optional(),
      postalCode: z.string().optional(),
    })
    .optional(),
  customFields: z
    .record(
      z.string(),
      z.union([z.string(), z.number(), z.boolean(), z.date(), z.null()])
    )
    .optional(),
});

type CompanyForm = z.infer<typeof companySchema>;

interface CompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company?: any;
  onSuccess: () => void;
}

export function CompanyDialog({
  open,
  onOpenChange,
  company,
  onSuccess,
}: CompanyDialogProps) {
  const [loading, setLoading] = useState(false);
  const [customFields, setCustomFields] = useState<any[]>([]);
  const [fieldsLoaded, setFieldsLoaded] = useState(false);

  const form = useForm<CompanyForm>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      website: "",
      address: {
        street: "",
        city: "",
        state: "",
        country: "",
        postalCode: "",
      },
      customFields: {},
    },
  });

  // Fetch custom fields when dialog opens
  useEffect(() => {
    if (open) {
      fetchCustomFields();
    } else {
      // Reset fields loaded state when dialog closes
      setFieldsLoaded(false);
    }
  }, [open]);

  // Reset form when company changes or custom fields are loaded
  useEffect(() => {
    if (!fieldsLoaded) return;

    if (company) {
      // Build custom fields object with all fields having default values
      const customFieldValues: Record<string, any> = {};

      customFields.forEach((field) => {
        const existingValue = company.customFields?.[field.fieldKey];

        if (existingValue !== undefined && existingValue !== null) {
          customFieldValues[field.fieldKey] = existingValue;
        } else {
          // Set appropriate defaults based on field type
          switch (field.fieldType) {
            case "boolean":
              customFieldValues[field.fieldKey] = false;
              break;
            case "number":
              customFieldValues[field.fieldKey] = "";
              break;
            case "select":
              customFieldValues[field.fieldKey] = "";
              break;
            case "date":
              customFieldValues[field.fieldKey] = "";
              break;
            case "text":
            case "textarea":
            default:
              customFieldValues[field.fieldKey] = "";
              break;
          }
        }
      });

      form.reset({
        name: company.name || "",
        slug: company.slug || "",
        email: company.email || "",
        phone: company.phone || "",
        website: company.website || "",
        address: company.address || {
          street: "",
          city: "",
          state: "",
          country: "",
          postalCode: "",
        },
        customFields: customFieldValues,
      });
    } else {
      // For new companies, initialize all custom fields with empty values
      const customFieldValues: Record<string, any> = {};

      customFields.forEach((field) => {
        switch (field.fieldType) {
          case "boolean":
            customFieldValues[field.fieldKey] = false;
            break;
          case "number":
          case "select":
          case "date":
          case "text":
          case "textarea":
          default:
            customFieldValues[field.fieldKey] = "";
            break;
        }
      });

      form.reset({
        name: "",
        email: "",
        phone: "",
        website: "",
        address: {
          street: "",
          city: "",
          state: "",
          country: "",
          postalCode: "",
        },
        customFields: customFieldValues,
      });
    }
  }, [company, customFields, fieldsLoaded, form]);

  const fetchCustomFields = async () => {
    try {
      const res = await fetch("/api/custom-fields?entityType=company");
      if (res.ok) {
        const fields = await res.json();
        setCustomFields(fields);
        setFieldsLoaded(true);
      }
    } catch (error) {
      console.error("Failed to fetch custom fields:", error);
      setFieldsLoaded(true);
    }
  };

  const onSubmit = async (data: CompanyForm) => {
    try {
      setLoading(true);

      const url = company ? `/api/companies/${company.id}` : "/api/companies";
      const method = company ? "PATCH" : "POST";

      // Clean up empty strings in customFields for non-text fields
      const cleanedData = {
        ...data,
        customFields: Object.entries(data.customFields || {}).reduce(
          (acc, [key, value]) => {
            const field = customFields.find((f) => f.fieldKey === key);
            if (field) {
              if (field.fieldType === "number" && value === "") {
                // Don't send empty strings for number fields
                return acc;
              }
              if (field.fieldType === "boolean") {
                acc[key] = Boolean(value);
                return acc;
              }
            }
            if (value !== "" && value !== null && value !== undefined) {
              acc[key] = value;
            }
            return acc;
          },
          {} as Record<string, any>
        ),
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cleanedData),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to save company");
      }

      onSuccess();
      form.reset();
    } catch (error: any) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const renderCustomField = (field: any) => {
    const fieldName = `customFields.${field.fieldKey}`;

    switch (field.fieldType) {
      case "textarea":
        return (
          <FormField
            key={field.id}
            control={form.control}
            name={fieldName as any}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>
                  {field.fieldLabel}
                  {field.required && " *"}
                </FormLabel>
                <FormControl>
                  <Textarea
                    {...formField}
                    value={formField.value || ""}
                    onChange={(e) => formField.onChange(e.target.value)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case "number":
        return (
          <FormField
            key={field.id}
            control={form.control}
            name={fieldName as any}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>
                  {field.fieldLabel}
                  {field.required && " *"}
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...formField}
                    value={formField.value || ""}
                    onChange={(e) => formField.onChange(e.target.value)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case "date":
        return (
          <FormField
            key={field.id}
            control={form.control}
            name={fieldName as any}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>
                  {field.fieldLabel}
                  {field.required && " *"}
                </FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    {...formField}
                    value={formField.value || ""}
                    onChange={(e) => formField.onChange(e.target.value)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case "boolean":
        return (
          <FormField
            key={field.id}
            control={form.control}
            name={fieldName as any}
            render={({ field: formField }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">
                    {field.fieldLabel}
                    {field.required && " *"}
                  </FormLabel>
                </div>
                <FormControl>
                  <Switch
                    checked={Boolean(formField.value)}
                    onCheckedChange={formField.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        );

      case "select":
        return (
          <FormField
            key={field.id}
            control={form.control}
            name={fieldName as any}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>
                  {field.fieldLabel}
                  {field.required && " *"}
                </FormLabel>
                <Select
                  onValueChange={formField.onChange}
                  value={formField.value || ""}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={`Select ${field.fieldLabel}`} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {field.options?.map((option: string) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      default:
        return (
          <FormField
            key={field.id}
            control={form.control}
            name={fieldName as any}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>
                  {field.fieldLabel}
                  {field.required && " *"}
                </FormLabel>
                <FormControl>
                  <Input
                    {...formField}
                    value={formField.value || ""}
                    onChange={(e) => formField.onChange(e.target.value)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{company ? "Edit Company" : "Add Company"}</DialogTitle>
          <DialogDescription>
            {company
              ? "Update the company information below"
              : "Enter the details for the new company"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="address">Address</TabsTrigger>
                {customFields.length > 0 && (
                  <TabsTrigger value="custom">Custom Fields</TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="general" className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Acme Corporation" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="contact@company.com"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="+1 (555) 123-4567" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website</FormLabel>
                      <FormControl>
                        <Input
                          type="url"
                          placeholder="https://example.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="address" className="space-y-4">
                <FormField
                  control={form.control}
                  name="address.street"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Street Address</FormLabel>
                      <FormControl>
                        <Input placeholder="123 Main Street" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="address.city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input placeholder="New York" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="address.state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State/Province</FormLabel>
                        <FormControl>
                          <Input placeholder="NY" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="address.country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country</FormLabel>
                        <FormControl>
                          <Input placeholder="United States" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="address.postalCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Postal Code</FormLabel>
                        <FormControl>
                          <Input placeholder="10001" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              {customFields.length > 0 && (
                <TabsContent value="custom" className="space-y-4">
                  {customFields.map(renderCustomField)}
                </TabsContent>
              )}
            </Tabs>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {company ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
