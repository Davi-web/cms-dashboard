import { useState, useEffect } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
} from "./components/ui/sidebar";
import { Button } from "./components/ui/button";
import { ContactsView } from "./components/ContactsView";
import { DashboardView } from "./components/DashboardView";
import { CompaniesView } from "./components/CompaniesView";
import { TasksView } from "./components/TasksView";
import { AuthForm } from "./components/AuthForm";
import { DataSyncDialog } from "./components/DataSyncDialog";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { useLocalStorage } from "./hooks/useLocalStorage";
import {
  Users,
  Building2,
  CheckSquare,
  BarChart3,
  Settings,
  LogOut,
  User,
  type LucideIcon,
} from "lucide-react";
import { useSidebar } from "./components/ui/sidebar";

function AppContent() {
  const { user, signOut, loading } = useAuth();
  const [activeView, setActiveView] = useState("dashboard");
  const [showSyncDialog, setShowSyncDialog] = useState(false);

  // Local storage for fallback/migration
  const [localContacts] = useLocalStorage("crm-contacts", []);
  const [localCompanies] = useLocalStorage("crm-companies", []);
  const [localTasks] = useLocalStorage("crm-tasks", []);

  const menuItems: IMenuItem[] = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "contacts", label: "Contacts", icon: Users },
    { id: "companies", label: "Companies", icon: Building2 },
    { id: "tasks", label: "Tasks", icon: CheckSquare },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  // Check for local data and offer sync when user first logs in
  useEffect(() => {
    if (
      user &&
      (localContacts.length > 0 ||
        localCompanies.length > 0 ||
        localTasks.length > 0)
    ) {
      const hasShownSync = localStorage.getItem("hasShownSync");
      if (!hasShownSync) {
        setShowSyncDialog(true);
        localStorage.setItem("hasShownSync", "true");
      }
    }
  }, [user, localContacts.length, localCompanies.length, localTasks.length]);

  const handleSyncComplete = () => {
    setShowSyncDialog(false);
    // Optionally refresh the app or show success message
    window.location.reload();
  };

  const renderView = () => {
    switch (activeView) {
      case "dashboard":
        return <DashboardView />;
      case "contacts":
        return <ContactsView />;
      case "companies":
        return <CompaniesView />;
      case "tasks":
        return <TasksView />;
      case "settings":
        return (
          <div className="p-6">
            <h1>Settings</h1>
            <div className="mt-6 space-y-4">
              <div className="p-4 border rounded-lg">
                <h3 className="font-medium mb-2">Account</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Signed in as: {user?.email}
                </p>
                <Button onClick={signOut} variant="outline">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>

              {(localContacts.length > 0 ||
                localCompanies.length > 0 ||
                localTasks.length > 0) && (
                <div className="p-4 border rounded-lg">
                  <h3 className="font-medium mb-2">Data Sync</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    You have local data that can be synced to the cloud.
                  </p>
                  <Button
                    onClick={() => setShowSyncDialog(true)}
                    variant="outline"
                  >
                    Sync Local Data
                  </Button>
                </div>
              )}
            </div>
          </div>
        );
      default:
        return <DashboardView />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  return (
    <>
      <SidebarProvider>
        <div className="flex min-h-[100dvh] w-full">
          <Sidebar>
            <SidebarHeader className="border-b p-4">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold">RelationshipCMS</h2>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground truncate">
                  {user.firstName} {user.lastName}
                </span>
              </div>
            </SidebarHeader>
            <SidebarContent>
              <AppSidebarMenu
                menuItems={menuItems}
                activeView={activeView}
                setActiveView={setActiveView}
              />
            </SidebarContent>
          </Sidebar>

          <main className="flex-1 relative z-50 flex flex-col">
            <div className="flex h-full flex-col">
              <header className="flex items-center gap-2 border-b px-4 py-3 sticky top-0 z-50 bg-background">
                <SidebarTrigger />
                <h1 className="capitalize">{activeView}</h1>
              </header>
              <div className="flex-1 overflow-auto">{renderView()}</div>
            </div>
          </main>
        </div>
      </SidebarProvider>

      <DataSyncDialog
        open={showSyncDialog}
        onClose={() => setShowSyncDialog(false)}
        localContacts={localContacts}
        localCompanies={localCompanies}
        localTasks={localTasks}
        onSyncComplete={handleSyncComplete}
      />
    </>
  );
}

interface IAppSidebarMenu {
  menuItems: IMenuItem[];
  activeView: string;
  setActiveView: (s: string) => void;
}
interface IMenuItem {
  id: string;
  icon: LucideIcon;
  label: string;
}

function AppSidebarMenu({
  menuItems,
  activeView,
  setActiveView,
}: IAppSidebarMenu) {
  const { isMobile, toggleSidebar } = useSidebar();

  return (
    <SidebarMenu>
      {menuItems.map((item) => (
        <SidebarMenuItem key={item.id}>
          <SidebarMenuButton
            onClick={() => {
              setActiveView(item.id);
              if (isMobile) toggleSidebar();
            }}
            isActive={activeView === item.id}
            className="w-full justify-start cursor-pointer"
          >
            <item.icon className="h-4 w-4" />
            <span>{item.label}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
