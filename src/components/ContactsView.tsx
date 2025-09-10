import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Plus,
  Search,
  Mail,
  Phone,
  Building2,
  Edit,
  Trash2,
  Users,
  Calendar,
  MessageSquare,
  Video,
  FileText,
  CheckSquare,
  Clock,
  LoaderCircle,
} from "lucide-react";
import { useLocalStorage } from "../hooks/useLocalStorage";
// import { useCloudData } from "../hooks/useCloudData";
import { useAuth } from "../contexts/AuthContext";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/utils/api";

interface Activity {
  id: string;
  type: "call" | "email" | "meeting" | "note" | "task" | "follow-up";
  description: string;
  date: string;
  createdAt: string;
}

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  position: string;
  tags: string[];
  notes: string;
  status: "active" | "inactive" | "lead";
  createdAt: string;
  lastContact: string;
  // Enhanced fields
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  birthday?: string;
  website?: string;
  linkedIn?: string;
  twitter?: string;
  leadSource?: string;
  preferredContact?: "email" | "phone" | "text" | "linkedin";
  activities: Activity[];
}

export function ContactsView() {
  const { user } = useAuth();
  const [localContacts, setLocalContacts] = useLocalStorage<Contact[]>(
    "crm-contacts",
    []
  );
  const queryClient = useQueryClient();

  const {
    data: cloudContacts,
    isLoading,
  } = useQuery<Contact[]>({
    queryKey: ["contacts"],
    queryFn: async () => {
      const res = await apiClient.getContacts();
      return res.contacts;
    },
    enabled: !!user, // only fetch if user is authenticated
    staleTime: 1000 * 60 * 5, // cache for 5 minutes
  });
  // // Use cloud data if authenticated, otherwise use local storage
  // const cloudData = useCloudData();
  const deleteContactMutation = useMutation({
    mutationFn: (contactId: string) => apiClient.deleteContact(contactId),
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
  const updateContactMutation = useMutation({
    mutationFn: (data: { contactId: string; contactData: Partial<Contact> }) =>
      apiClient.updateContact(data.contactId, data.contactData),
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
  const createContactMutation = useMutation({
    mutationFn: (
      contactData: Omit<Contact, "id" | "createdAt" | "lastContact">
    ) => apiClient.createContact(contactData),
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });

  // Ensure all contacts have activities array (for backward compatibility)
  const normalizedContacts = (user ? cloudContacts || [] : localContacts)
    .filter((contact) => contact != null && typeof contact === "object")
    .map((contact) => ({
      ...contact,
      activities: contact.activities || [],
    }));

  const contacts = normalizedContacts;
  // const setContacts = user ? () => {} : setLocalContacts;
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    company: "",
    position: "",
    tags: "",
    notes: "",
    status: "lead" as Contact["status"],
    // Enhanced fields
    street: "",
    city: "",
    state: "",
    zipCode: "",
    country: "",
    birthday: "",
    website: "",
    linkedIn: "",
    twitter: "",
    leadSource: "",
    preferredContact: "" as Contact["preferredContact"] | "",
  });

  // Activity form state
  const [activityData, setActivityData] = useState({
    type: "note" as Activity["type"],
    description: "",
    date: new Date().toISOString().split("T")[0],
  });

  const filteredContacts = contacts.filter((contact) => {
    if (!contact) return false;

    const matchesSearch =
      (contact.firstName || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (contact.lastName || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (contact.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (contact.company || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      filterStatus === "all" || contact.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const contactData = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      company: formData.company,
      position: formData.position,
      tags: formData.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      notes: formData.notes,
      status: formData.status,
      // Enhanced fields
      address: {
        street: formData.street,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
        country: formData.country,
      },
      birthday: formData.birthday,
      website: formData.website,
      linkedIn: formData.linkedIn,
      twitter: formData.twitter,
      leadSource: formData.leadSource,
      preferredContact: formData.preferredContact || undefined,
      activities: editingContact?.activities || [],
    };

    try {
      if (user) {
        // Use cloud data
        if (editingContact) {
          // await useMutation({
          //   mutationFn: () =>
          //     apiClient.updateContact(editingContact.id, contactData),
          // })
          await updateContactMutation.mutateAsync({
            contactId: editingContact.id,
            contactData,
          });
        } else {
          // await useMutation({
          //   mutationFn: () => apiClient.createContact(contactData),
          // })
          await createContactMutation.mutateAsync(contactData);
        }
      } else {
        // Use local storage
        const contact: Contact = {
          id: editingContact?.id || Date.now().toString(),
          ...contactData,
          activities: contactData.activities || [],
          createdAt: editingContact?.createdAt || new Date().toISOString(),
          lastContact: new Date().toISOString(),
        };

        if (editingContact) {
          setLocalContacts((prev) =>
            prev.map((c) => (c && c.id === editingContact.id ? contact : c))
          );
        } else {
          setLocalContacts((prev) => [...prev, contact]);
        }
      }

      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Error saving contact:", error);
      alert("Failed to save contact. Please try again.");
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      company: "",
      position: "",
      tags: "",
      notes: "",
      status: "lead",
      // Enhanced fields
      street: "",
      city: "",
      state: "",
      zipCode: "",
      country: "",
      birthday: "",
      website: "",
      linkedIn: "",
      twitter: "",
      leadSource: "",
      preferredContact: "",
    });
    setActivityData({
      type: "note",
      description: "",
      date: new Date().toISOString().split("T")[0],
    });
    setEditingContact(null);
  };

  const handleEdit = (contact: Contact) => {
    setEditingContact(contact);
    setFormData({
      firstName: contact.firstName || "",
      lastName: contact.lastName || "",
      email: contact.email || "",
      phone: contact.phone || "",
      company: contact.company || "",
      position: contact.position || "",
      tags: (contact.tags || []).join(", "),
      notes: contact.notes || "",
      status: contact.status || "lead",
      // Enhanced fields
      street: contact.address?.street || "",
      city: contact.address?.city || "",
      state: contact.address?.state || "",
      zipCode: contact.address?.zipCode || "",
      country: contact.address?.country || "",
      birthday: contact.birthday || "",
      website: contact.website || "",
      linkedIn: contact.linkedIn || "",
      twitter: contact.twitter || "",
      leadSource: contact.leadSource || "",
      preferredContact: contact.preferredContact || "",
    });
    setActivityData({
      type: "note",
      description: "",
      date: new Date().toISOString().split("T")[0],
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (contactId: string) => {
    if (confirm("Are you sure you want to delete this contact?")) {
      try {
        if (user) {
          // await useMutation({
          //   mutationFn: () => apiClient.deleteContact(contactId),
          // })
          await deleteContactMutation.mutateAsync(contactId);
        } else {
          setLocalContacts((prev) =>
            prev.filter((c) => c && c.id !== contactId)
          );
        }
      } catch (error) {
        console.error("Error deleting contact:", error);
        alert("Failed to delete contact. Please try again.");
      }
    }
  };

  const getStatusColor = (status: Contact["status"]) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "inactive":
        return "bg-gray-100 text-gray-800";
      case "lead":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const addActivity = async () => {
    if (!editingContact || !activityData.description.trim()) return;

    const newActivity: Activity = {
      id: Date.now().toString(),
      type: activityData.type,
      description: activityData.description.trim(),
      date: activityData.date,
      createdAt: new Date().toISOString(),
    };

    const updatedActivities = [
      newActivity,
      ...(editingContact.activities || []),
    ];

    try {
      if (user) {
        // Use cloud data
        // await useMutation({
        //   mutationFn: () =>
        //     apiClient.updateContact(editingContact.id, {
        //       activities: updatedActivities,
        //       lastContact: new Date().toISOString(),
        //     }),
        // })
        await updateContactMutation.mutateAsync({
          contactId: editingContact.id,
          contactData: {
            activities: updatedActivities,
            lastContact: new Date().toISOString(),
          },
        });
      } else {
        // Use local storage
        setLocalContacts((prev) =>
          prev.map((c) =>
            c && c.id === editingContact.id
              ? {
                  ...c,
                  activities: updatedActivities,
                  lastContact: new Date().toISOString(),
                }
              : c
          )
        );
      }

      // Update editing contact state
      setEditingContact((prev) =>
        prev ? { ...prev, activities: updatedActivities } : null
      );

      // Reset activity form
      setActivityData({
        type: "note",
        description: "",
        date: new Date().toISOString().split("T")[0],
      });
    } catch (error) {
      console.error("Error adding activity:", error);
      alert("Failed to add activity. Please try again.");
    }
  };

  const getActivityIcon = (type: Activity["type"]) => {
    switch (type) {
      case "call":
        return Phone;
      case "email":
        return Mail;
      case "meeting":
        return Video;
      case "note":
        return FileText;
      case "task":
        return CheckSquare;
      case "follow-up":
        return Clock;
      default:
        return MessageSquare;
    }
  };

  const getActivityTypeLabel = (type: Activity["type"]) => {
    switch (type) {
      case "call":
        return "Phone Call";
      case "email":
        return "Email";
      case "meeting":
        return "Meeting";
      case "note":
        return "Note";
      case "task":
        return "Task";
      case "follow-up":
        return "Follow-up";
      default:
        return "Activity";
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1>Contacts</h1>
          <p className="text-muted-foreground">
            Manage your contact relationships
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Contact
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingContact ? "Edit Contact" : "Add New Contact"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  Basic Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          firstName: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          lastName: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          phone: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="birthday">Birthday</Label>
                    <Input
                      id="birthday"
                      type="date"
                      value={formData.birthday}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          birthday: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="preferredContact">
                      Preferred Contact Method
                    </Label>
                    <Select
                      value={formData.preferredContact}
                      onValueChange={(value: string) =>
                        setFormData((prev) => ({
                          ...prev,
                          preferredContact:
                            value as Contact["preferredContact"],
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="phone">Phone</SelectItem>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="linkedin">LinkedIn</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Professional Information */}
              <div className="space-y-4">
                <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  Professional Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="company">Company</Label>
                    <Input
                      id="company"
                      value={formData.company}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          company: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="position">Position</Label>
                    <Input
                      id="position"
                      value={formData.position}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          position: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value: Contact["status"]) =>
                        setFormData((prev) => ({ ...prev, status: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lead">Lead</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="leadSource">Lead Source</Label>
                    <Input
                      id="leadSource"
                      value={formData.leadSource}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          leadSource: e.target.value,
                        }))
                      }
                      placeholder="Website, referral, event, etc."
                    />
                  </div>
                </div>
              </div>

              {/* Address Information */}
              <div className="space-y-4">
                <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  Address
                </h3>
                <div>
                  <Label htmlFor="street">Street Address</Label>
                  <Input
                    id="street"
                    value={formData.street}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        street: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          city: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">State/Province</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          state: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="zipCode">ZIP/Postal Code</Label>
                    <Input
                      id="zipCode"
                      value={formData.zipCode}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          zipCode: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        country: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              {/* Online Presence */}
              <div className="space-y-4">
                <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  Online Presence
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      type="url"
                      value={formData.website}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          website: e.target.value,
                        }))
                      }
                      placeholder="https://example.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="linkedIn">LinkedIn Profile</Label>
                    <Input
                      id="linkedIn"
                      value={formData.linkedIn}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          linkedIn: e.target.value,
                        }))
                      }
                      placeholder="linkedin.com/in/username"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="twitter">Twitter/X Handle</Label>
                  <Input
                    id="twitter"
                    value={formData.twitter}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        twitter: e.target.value,
                      }))
                    }
                    placeholder="@username"
                  />
                </div>
              </div>

              {/* Additional Information */}
              <div className="space-y-4">
                <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  Additional Information
                </h3>
                <div>
                  <Label htmlFor="tags">Tags (comma separated)</Label>
                  <Input
                    id="tags"
                    value={formData.tags}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, tags: e.target.value }))
                    }
                    placeholder="client, important, follow-up"
                  />
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        notes: e.target.value,
                      }))
                    }
                    rows={3}
                  />
                </div>
              </div>

              {/* Activities Section */}
              {editingContact && (
                <div className="space-y-4 border-t pt-6">
                  <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                    Activities
                  </h3>

                  {/* Add New Activity */}
                  <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                    <h4 className="text-sm font-medium">Add New Activity</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="activityType">Type</Label>
                        <Select
                          value={activityData.type}
                          onValueChange={(value: Activity["type"]) =>
                            setActivityData((prev) => ({
                              ...prev,
                              type: value,
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="call">Phone Call</SelectItem>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="meeting">Meeting</SelectItem>
                            <SelectItem value="note">Note</SelectItem>
                            <SelectItem value="task">Task</SelectItem>
                            <SelectItem value="follow-up">Follow-up</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="activityDate">Date</Label>
                        <Input
                          id="activityDate"
                          type="date"
                          value={activityData.date}
                          onChange={(e) =>
                            setActivityData((prev) => ({
                              ...prev,
                              date: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="activityDescription">Description</Label>
                      <Textarea
                        id="activityDescription"
                        value={activityData.description}
                        onChange={(e) =>
                          setActivityData((prev) => ({
                            ...prev,
                            description: e.target.value,
                          }))
                        }
                        placeholder="Describe the activity..."
                        rows={2}
                      />
                    </div>
                    <Button
                      type="button"
                      onClick={addActivity}
                      size="sm"
                      disabled={!activityData.description.trim()}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Activity
                    </Button>
                  </div>

                  {/* Activities List */}
                  {editingContact.activities &&
                    editingContact.activities.length > 0 && (
                      <div className="space-y-3 max-h-60 overflow-y-auto">
                        <h4 className="text-sm font-medium">
                          Activity History
                        </h4>
                        {editingContact.activities.map((activity) => {
                          if (!activity) return null;
                          const IconComponent = getActivityIcon(activity.type);
                          return (
                            <div
                              key={activity.id}
                              className="flex gap-3 p-3 bg-background border rounded-lg"
                            >
                              <div className="flex-shrink-0">
                                <IconComponent className="h-4 w-4 text-muted-foreground mt-0.5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-medium">
                                    {getActivityTypeLabel(activity.type)}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {activity.date
                                      ? new Date(
                                          activity.date
                                        ).toLocaleDateString()
                                      : "No date"}
                                  </span>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {activity.description || "No description"}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1">
                  {editingContact ? "Update Contact" : "Add Contact"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search contacts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="lead">Leads</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <LoaderCircle className="animate-spin mx-auto h-8 w-8 text-muted-foreground" />
      ) : (
        <>
          {filteredContacts.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3>No contacts found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm || filterStatus !== "all"
                    ? "Try adjusting your search or filter criteria."
                    : "Get started by adding your first contact."}
                </p>
                {!searchTerm && filterStatus === "all" && (
                  <Button onClick={() => setIsDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Contact
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredContacts.map((contact) => {
                if (!contact) return null;
                return (
                  <Card
                    key={contact.id}
                    className="hover:shadow-md transition-shadow"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-medium">
                            {contact.firstName || "Unknown"}{" "}
                            {contact.lastName || ""}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {contact.position || "No position"}
                          </p>
                        </div>
                        <Badge
                          className={getStatusColor(contact.status || "lead")}
                          variant="secondary"
                        >
                          {contact.status || "lead"}
                        </Badge>
                      </div>

                      <div className="space-y-2 mb-4">
                        {contact.email && (
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span className="truncate">{contact.email}</span>
                          </div>
                        )}
                        {contact.phone && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span className="truncate">{contact.phone}</span>
                          </div>
                        )}
                        {contact.company && (
                          <div className="flex items-center gap-2 text-sm">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span className="truncate">{contact.company}</span>
                          </div>
                        )}
                      </div>

                      {/* Recent Activity */}
                      {contact.activities && contact.activities.length > 0 && (
                        <div className="pt-2 border-t">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                            <Calendar className="h-3 w-3" />
                            <span>Latest Activity</span>
                          </div>
                          <div className="text-xs">
                            <div className="flex items-center gap-2">
                              {(() => {
                                const latestActivity = contact.activities[0];
                                if (!latestActivity) return null;
                                const IconComponent = getActivityIcon(
                                  latestActivity.type
                                );
                                return (
                                  <>
                                    <IconComponent className="h-3 w-3 text-muted-foreground" />
                                    <span className="font-medium">
                                      {getActivityTypeLabel(
                                        latestActivity.type
                                      )}
                                    </span>
                                    <span className="text-muted-foreground">
                                      {latestActivity.date
                                        ? new Date(
                                            latestActivity.date
                                          ).toLocaleDateString()
                                        : "No date"}
                                    </span>
                                  </>
                                );
                              })()}
                            </div>
                            {contact.activities[0] && (
                              <p className="text-muted-foreground mt-1 text-xs overflow-hidden">
                                {contact.activities[0].description &&
                                contact.activities[0].description.length > 50
                                  ? contact.activities[0].description.substring(
                                      0,
                                      50
                                    ) + "..."
                                  : contact.activities[0].description ||
                                    "No description"}
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Tags */}
                      {contact.tags && contact.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {contact.tags.slice(0, 3).map((tag, index) => (
                            <Badge
                              key={index}
                              variant="outline"
                              className="text-xs"
                            >
                              {tag}
                            </Badge>
                          ))}
                          {contact.tags.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{contact.tags.length - 3} more
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-2 mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(contact)}
                          className="flex-1"
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(contact.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
