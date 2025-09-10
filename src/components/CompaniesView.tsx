import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
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
  Building2,
  Users,
  Edit,
  Trash2,
  MapPin,
  Globe,
  Loader2,
} from "lucide-react";
import { useLocalStorage } from "../hooks/useLocalStorage";
// import { useCloudData } from "../hooks/useCloudData";
import { useAuth } from "../contexts/AuthContext";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/utils/api";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";
interface Company {
  id: string;
  name: string;
  industry: string;
  website: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  country: string;
  size: "startup" | "small" | "medium" | "large" | "enterprise";
  status: "prospect" | "active" | "inactive" | "partner";
  notes: string;
  createdAt: string;
}

export function CompaniesView() {
  const { user } = useAuth();
  const [localCompanies, setLocalCompanies] = useLocalStorage<Company[]>(
    "crm-companies",
    []
  );
  const [localContacts] = useLocalStorage("crm-contacts", []);
  const queryClient = useQueryClient();
  // Use cloud data if authenticated, otherwise use local storage
  // const cloudData = useCloudData();
  const { data: companiesData, isLoading: companiesLoading } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const res = await apiClient.getCompanies();
      return res.companies;
    },
    enabled: !!user,
  });
  const { data: contactsData } = useQuery({
    queryKey: ["contacts"],
    queryFn: async () => {
      const res = await apiClient.getContacts();
      return res.contacts;
    },
    enabled: !!user,
  });

  // Company mutations
  const deleteCompanyMutation = useMutation({
    mutationFn: (companyId: string) => apiClient.deleteCompany(companyId),
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
  });

  const updateCompanyMutation = useMutation({
    mutationFn: (data: { companyId: string; companyData: Partial<Company> }) =>
      apiClient.updateCompany(data.companyId, data.companyData),
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
  });

  const createCompanyMutation = useMutation({
    mutationFn: (companyData: Omit<Company, "id" | "createdAt">) =>
      apiClient.createCompany(companyData),
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
  });
  // console.log("Rendering companiesview", cloudData);

  const companies = user ? companiesData : localCompanies;
  const contacts = user ? contactsData : localContacts;
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    industry: "",
    website: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    country: "",
    size: "small" as Company["size"],
    status: "prospect" as Company["status"],
    notes: "",
  });

  const filteredCompanies = companies?.filter((company) => {
    const matchesSearch =
      company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.industry.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.city.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      filterStatus === "all" || company.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const getCompanyContactCount = (companyName: string) => {
    return contacts?.filter((contact) => contact.company === companyName)
      .length;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const companyData = {
      name: formData.name,
      industry: formData.industry,
      website: formData.website,
      phone: formData.phone,
      email: formData.email,
      address: formData.address,
      city: formData.city,
      country: formData.country,
      size: formData.size,
      status: formData.status,
      notes: formData.notes,
    };

    try {
      if (user) {
        // Use cloud data
        if (editingCompany) {
          // await cloudData.updateCompany(editingCompany.id, companyData);
          await updateCompanyMutation.mutateAsync({
            companyId: editingCompany.id,
            companyData,
          });
          toast.success("Company has been updated");
        } else {
          // await cloudData.addCompany(companyData);
          await createCompanyMutation.mutateAsync(companyData);
          toast.success("Company has been created");
        }
      } else {
        // Use local storage
        const company: Company = {
          id: editingCompany?.id || Date.now().toString(),
          ...companyData,
          createdAt: editingCompany?.createdAt || new Date().toISOString(),
        };

        if (editingCompany) {
          setLocalCompanies((prev) =>
            prev.map((c) => (c.id === editingCompany.id ? company : c))
          );
        } else {
          setLocalCompanies((prev) => [...prev, company]);
        }
      }

      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Error saving company:", error);
      toast.error("Failed to save company. Please try again.");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      industry: "",
      website: "",
      phone: "",
      email: "",
      address: "",
      city: "",
      country: "",
      size: "small",
      status: "prospect",
      notes: "",
    });
    setEditingCompany(null);
  };

  const handleEdit = (company: Company) => {
    setEditingCompany(company);
    setFormData({
      name: company.name,
      industry: company.industry,
      website: company.website,
      phone: company.phone,
      email: company.email,
      address: company.address,
      city: company.city,
      country: company.country,
      size: company.size,
      status: company.status,
      notes: company.notes,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (companyId: string) => {
    try {
      if (user) {
        // await cloudData.deleteCompany(companyId);
        await deleteCompanyMutation.mutateAsync(companyId);
        toast.success("Company has been deleted");
      } else {
        setLocalCompanies((prev) => prev.filter((c) => c.id !== companyId));
      }
    } catch (error) {
      console.error("Error deleting company:", error);
      toast.error("Failed to delete company. Please try again.");
    }
  };

  const getStatusColor = (status: Company["status"]) => {
    switch (status) {
      case "prospect":
        return "bg-yellow-100 text-yellow-800";
      case "active":
        return "bg-green-100 text-green-800";
      case "inactive":
        return "bg-gray-100 text-gray-800";
      case "partner":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getSizeColor = (size: Company["size"]) => {
    switch (size) {
      case "startup":
        return "bg-blue-100 text-blue-800";
      case "small":
        return "bg-green-100 text-green-800";
      case "medium":
        return "bg-orange-100 text-orange-800";
      case "large":
        return "bg-red-100 text-red-800";
      case "enterprise":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1>Companies</h1>
          <p className="text-muted-foreground">
            Manage your business relationships
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Company
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingCompany ? "Edit Company" : "Add New Company"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Company Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="industry">Industry</Label>
                <Input
                  id="industry"
                  value={formData.industry}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      industry: e.target.value,
                    }))
                  }
                />
              </div>

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

              <div className="grid grid-cols-2 gap-4">
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
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      address: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, city: e.target.value }))
                    }
                  />
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="size">Company Size</Label>
                  <Select
                    value={formData.size}
                    onValueChange={(value: Company["size"]) =>
                      setFormData((prev) => ({ ...prev, size: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="startup">Startup</SelectItem>
                      <SelectItem value="small">Small (1-50)</SelectItem>
                      <SelectItem value="medium">Medium (51-200)</SelectItem>
                      <SelectItem value="large">Large (201-1000)</SelectItem>
                      <SelectItem value="enterprise">
                        Enterprise (1000+)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: Company["status"]) =>
                      setFormData((prev) => ({ ...prev, status: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="prospect">Prospect</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="partner">Partner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  rows={3}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1">
                  {updateCompanyMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <span>
                      {editingCompany ? "Update Company" : "Add Company"}
                    </span>
                  )}
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
            placeholder="Search companies..."
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
            <SelectItem value="prospect">Prospects</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="partner">Partners</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {companiesLoading ? (
        <Loader2 className="mx-auto h-10 w-10 text-muted-foreground animate-spin" />
      ) : (
        <>
          {filteredCompanies?.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Building2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3>No companies found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm || filterStatus !== "all"
                    ? "Try adjusting your search or filter criteria."
                    : "Get started by adding your first company."}
                </p>
                {!searchTerm && filterStatus === "all" && (
                  <Button onClick={() => setIsDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Company
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCompanies?.map((company) => (
                <Card
                  key={company.id}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg truncate">
                          {company.name}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground truncate">
                          {company.industry}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1 ml-2">
                        <Badge className={getStatusColor(company.status)}>
                          {company.status}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      {company.website && (
                        <div className="flex items-center gap-2 text-sm">
                          <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <a
                            href={
                              company.website.startsWith("http")
                                ? company.website
                                : `https://${company.website}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline truncate"
                          >
                            {company.website.replace(/^https?:\/\//, "")}
                          </a>
                        </div>
                      )}
                      {(company.city || company.country) && (
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="truncate">
                            {[company.city, company.country]
                              .filter(Boolean)
                              .join(", ")}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span>
                          {getCompanyContactCount(company.name)} contacts
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <Badge
                        className={getSizeColor(company.size)}
                        variant="outline"
                      >
                        {company.size}
                      </Badge>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(company)}
                        className="flex-1"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Delete {company.name}?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. It will permanently
                              remove this company from our database.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="cursor-pointer">
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(company.id)}
                              className="bg-red-600 text-white hover:bg-red-700 cursor-pointer"
                            >
                              Continue
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      {/* <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(company.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button> */}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
