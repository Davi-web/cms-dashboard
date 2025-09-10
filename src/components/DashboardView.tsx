import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import {
  Users,
  Building2,
  CheckSquare,
  Calendar,
  TrendingUp,
} from "lucide-react";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { useAuth } from "../contexts/AuthContext";
import { Skeleton } from "./ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { apiClient, type Company } from "@/utils/api";

export function DashboardView() {
  const { user } = useAuth();
  const [localContacts] = useLocalStorage("crm-contacts", []);
  const [localCompanies] = useLocalStorage("crm-companies", []);
  const [localTasks] = useLocalStorage("crm-tasks", []);

  const { data: contactsData = [], isLoading: contactsLoading } = useQuery({
    queryKey: ["contacts"],
    queryFn: async () => {
      const res = await apiClient.getContacts();
      return res.contacts;
    },
    enabled: !!user,
  });

  const { data: companiesData = [], isLoading: companiesLoading } = useQuery<
    Company[]
  >({
    queryKey: ["companies"],
    queryFn: async () => {
      const res = await apiClient.getCompanies();
      return res.companies;
    },
    enabled: !!user,
  });

  const { data: tasksData = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const res = await apiClient.getTasks();
      return res.tasks;
    },
    enabled: !!user,
  });

  // Decide data source
  const contacts = (user ? contactsData : localContacts)
    .filter((c) => c != null && typeof c === "object")
    .map((c) => ({ ...c, activities: c.activities || [] }));

  const companies = (user ? companiesData : localCompanies).filter(
    (c) => c != null && typeof c === "object"
  );

  const tasks = (user ? tasksData : localTasks).filter(
    (t) => t != null && typeof t === "object"
  );
  console.log(contacts, companies, tasks);

  // Stats
  const stats = [
    {
      title: "Total Contacts",
      value: contacts.length,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Companies",
      value: companies.length,
      icon: Building2,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Active Tasks",
      value: tasks.filter((t) => t && !t.completed).length,
      icon: CheckSquare,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
    {
      title: "This Month",
      value: contacts.filter((c) => {
        if (!c || !c.createdAt) return false;
        const contactDate = new Date(c.createdAt);
        const now = new Date();
        return (
          contactDate.getMonth() === now.getMonth() &&
          contactDate.getFullYear() === now.getFullYear()
        );
      }).length,
      icon: TrendingUp,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
  ];

  const recentContacts = contacts
    .filter((c) => c && c.createdAt)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 5);

  const upcomingTasks = tasks
    .filter((t) => t && !t.completed && t.dueDate)
    .sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    )
    .slice(0, 5);

  // ---------------------
  // Skeleton Components
  // ---------------------
  const SectionSkeleton = ({ rows = 3 }: { rows?: number }) => (
    <div className="animate-pulse space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-4 w-full bg-gray-200 rounded"></div>
      ))}
    </div>
  );
  if (!user) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Please sign in to view your dashboard.
      </div>
    );
  }

  // ---------------------
  // Render
  // ---------------------
  return (
    <div className="p-6 space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => {
          let isLoading = false;

          switch (stat.title.toLowerCase()) {
            case "total contacts":
              isLoading = contactsLoading;
              break;
            case "active tasks":
              isLoading = tasksLoading;
              break;
            case "companies":
              isLoading = companiesLoading;
              break;
            case "this month":
              isLoading = contactsLoading;
              break;
            default:
              isLoading = false;
          }
          return (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {stat.title}
                    </p>
                    <span className="text-2xl font-semibold">
                      {isLoading ? (
                        <Skeleton className="h-6 w-12" />
                      ) : (
                        stat.value
                      )}
                    </span>
                  </div>
                  <div className={`p-2 rounded-full ${stat.bgColor}`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Contacts & Upcoming Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Contacts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Recent Contacts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {contactsLoading ? (
              <SectionSkeleton rows={5} />
            ) : recentContacts.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No contacts yet
              </p>
            ) : (
              <div className="space-y-3">
                {recentContacts.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div>
                      <p className="font-medium">
                        {c.firstName || "Unknown"} {c.lastName || ""}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {c.email || "No email"}
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {c.company || "No Company"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tasksLoading ? (
              <SectionSkeleton rows={5} />
            ) : upcomingTasks.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No upcoming tasks
              </p>
            ) : (
              <div className="space-y-3">
                {upcomingTasks.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div>
                      <p className="font-medium">
                        {t.title || "Untitled Task"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Due:{" "}
                        {t.dueDate
                          ? new Date(t.dueDate).toLocaleDateString()
                          : "No due date"}
                      </p>
                    </div>
                    <Badge
                      variant={
                        t.priority === "high" ? "destructive" : "secondary"
                      }
                    >
                      {t.priority || "medium"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
