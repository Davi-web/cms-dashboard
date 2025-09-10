import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent} from "./ui/card";
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
import { Checkbox } from "./ui/checkbox";
import {
  Plus,
  Search,
  CheckSquare,
  Calendar,
  Clock,
  User,
  Edit,
  Trash2,
  LoaderCircle,
} from "lucide-react";
import { useLocalStorage } from "../hooks/useLocalStorage";
// import { useCloudData } from "../hooks/useCloudData";
import { useAuth } from "../contexts/AuthContext";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/utils/api";

interface Task {
  id: string;
  title: string;
  description: string;
  type: "call" | "email" | "meeting" | "follow-up" | "other";
  priority: "low" | "medium" | "high";
  status: "pending" | "in-progress" | "completed";
  contactId?: string;
  contactName?: string;
  companyName?: string;
  dueDate: string;
  completed: boolean;
  createdAt: string;
  completedAt?: string;
}

export function TasksView() {
  const { user } = useAuth();
  const [localTasks, setLocalTasks] = useLocalStorage<Task[]>("crm-tasks", []);
  const [localContacts] = useLocalStorage("crm-contacts", []);

  // Use cloud data if authenticated, otherwise use local storage
  // const cloudData = useCloudData();
  const queryClient = useQueryClient();

  const {data: tasksData, isLoading} = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const res = await apiClient.getTasks();
      return res.tasks;
    },
    enabled: !!user,
  })
  const {data: contactsData} = useQuery({
    queryKey: ['contacts'],
    queryFn: async () => {
      const res = await apiClient.getContacts();
      return res.contacts;
    },
    enabled: !!user,
  })

  // Task mutations
 const deleteTaskMutation = useMutation({
    mutationFn: (taskId: string) =>
        apiClient.deleteTask(taskId),
    onSuccess: () => {
        // Invalidate and refetch
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
});

 const updateTaskMutation = useMutation({
    mutationFn: (data: { taskId: string; taskData: Partial<Task> }) =>
        apiClient.updateTask(data.taskId, data.taskData),
    onSuccess: () => {
        // Invalidate and refetch
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
    }
});

 const createTaskMutation = useMutation({
    mutationFn: (taskData: Omit<Task, "id" | "createdAt">) =>
        apiClient.createTask(taskData),
    onSuccess: () => {
        // Invalidate and refetch
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
    }
});
  const tasks = user ? tasksData : localTasks;
  const contacts = user ? contactsData : localContacts;
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  console.log(tasks)

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "call" as Task["type"],
    priority: "medium" as Task["priority"],
    status: "pending" as Task["status"],
    contactId: "",
    dueDate: "",
  });

  const filteredTasks = tasks?.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.contactName &&
        task.contactName.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "completed" && task.completed) ||
      (filterStatus === "pending" && !task.completed);

    const matchesPriority =
      filterPriority === "all" || task.priority === filterPriority;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const sortedTasks = filteredTasks?.sort((a, b) => {
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const selectedContact = contacts?.find((c) => c.id === formData.contactId);

    const taskData = {
      title: formData.title,
      description: formData.description,
      type: formData.type,
      priority: formData.priority,
      status: formData.status,
      contactId: formData.contactId || undefined,
      contactName: selectedContact
        ? `${selectedContact.firstName} ${selectedContact.lastName}`
        : undefined,
      companyName: selectedContact?.company || undefined,
      dueDate: formData.dueDate,
      completed: editingTask?.completed || false,
      completedAt: editingTask?.completedAt,
    };

    try {
      if (user) {
        // Use cloud data
        if (editingTask) {
          // await cloudData.updateTask(editingTask.id, taskData);
          await updateTaskMutation.mutateAsync({ taskId: editingTask.id, taskData });
        } else {
          // await cloudData.addTask(taskData);
          await createTaskMutation.mutateAsync(taskData);
        }
      } else {
        // Use local storage
        const task: Task = {
          id: editingTask?.id || Date.now().toString(),
          ...taskData,
          createdAt: editingTask?.createdAt || new Date().toISOString(),
        };

        if (editingTask) {
          setLocalTasks((prev) =>
            prev.map((t) => (t.id === editingTask.id ? task : t))
          );
        } else {
          setLocalTasks((prev) => [...prev, task]);
        }
      }

      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Error saving task:", error);
      alert("Failed to save task. Please try again.");
    }
  };

  const resetForm = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    setFormData({
      title: "",
      description: "",
      type: "call",
      priority: "medium",
      status: "pending",
      contactId: "",
      dueDate: tomorrow.toISOString().split("T")[0],
    });
    setEditingTask(null);
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description,
      type: task.type,
      priority: task.priority,
      status: task.status,
      contactId: task.contactId || "",
      dueDate: task.dueDate.split("T")[0],
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (taskId: string) => {
    if (confirm("Are you sure you want to delete this task?")) {
      try {
        if (user) {
          // await cloudData.deleteTask(taskId);
          await deleteTaskMutation.mutateAsync(taskId);
        } else {
          setLocalTasks((prev) => prev.filter((t) => t.id !== taskId));
        }
      } catch (error) {
        console.error("Error deleting task:", error);
        alert("Failed to delete task. Please try again.");
      }
    }
  };

  const toggleTaskCompletion = async (taskId: string) => {
    try {
      const task = tasks?.find((t) => t.id === taskId);
      if (!task) return;

      const updates = {
        completed: !task.completed,
        completedAt: !task.completed ? new Date().toISOString() : undefined,
        status: (!task.completed ? "completed" : "pending") as Task["status"],
      };

      if (user) {
        // await cloudData.updateTask(taskId, updates);
        await updateTaskMutation.mutateAsync({ taskId, taskData: updates });
      } else {
        setLocalTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, ...updates } : t))
        );
      }
    } catch (error) {
      console.error("Error updating task:", error);
      alert("Failed to update task. Please try again.");
    }
  };

  const getPriorityColor = (priority: Task["priority"]) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTypeColor = (type: Task["type"]) => {
    switch (type) {
      case "call":
        return "bg-blue-100 text-blue-800";
      case "email":
        return "bg-purple-100 text-purple-800";
      case "meeting":
        return "bg-orange-100 text-orange-800";
      case "follow-up":
        return "bg-green-100 text-green-800";
      case "other":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const isOverdue = (dueDate: string, completed: boolean) => {
    if (completed) return false;
    return new Date(dueDate) < new Date();
  };

  // Initialize with tomorrow's date
  useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setFormData((prev) => ({
      ...prev,
      dueDate: tomorrow.toISOString().split("T")[0],
    }));
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1>Tasks</h1>
          <p className="text-muted-foreground">
            Manage your follow-ups and activities
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingTask ? "Edit Task" : "Add New Task"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Task Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, title: e.target.value }))
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: Task["type"]) =>
                      setFormData((prev) => ({ ...prev, type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="call">Call</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="meeting">Meeting</SelectItem>
                      <SelectItem value="follow-up">Follow-up</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value: Task["priority"]) =>
                      setFormData((prev) => ({ ...prev, priority: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="contactId">Related Contact (Optional)</Label>
                <Select
                  value={formData.contactId}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, contactId: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a contact" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="None">No contact</SelectItem>
                    {contacts && contacts.length > 0 &&
                      contacts.map((contact) => (
                        <SelectItem key={contact.id} value={contact.id}>
                          {contact.firstName} {contact.lastName}{" "}
                          {contact.company && `(${contact.company})`}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      dueDate: e.target.value,
                    }))
                  }
                  required
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1">
                  {editingTask ? "Update Task" : "Add Task"}
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
      <div className="flex gap-4 items-center flex-wrap">
        <div className="relative flex-1 min-w-0 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search tasks..."
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
            <SelectItem value="all">All Tasks</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <LoaderCircle className="mx-auto h-10 w-10 text-muted-foreground animate-spin" />
      ) : (
        <>
          {sortedTasks?.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <CheckSquare className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3>No tasks found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm ||
                  filterStatus !== "all" ||
                  filterPriority !== "all"
                    ? "Try adjusting your search or filter criteria."
                    : "Get started by adding your first task."}
                </p>
                {!searchTerm &&
                  filterStatus === "all" &&
                  filterPriority === "all" && (
                    <Button onClick={() => setIsDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Your First Task
                    </Button>
                  )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {sortedTasks?.map((task) => (
                <Card
                  key={task.id}
                  className={`transition-all ${
                    task.completed ? "opacity-60" : ""
                  } ${
                    isOverdue(task.dueDate, task.completed)
                      ? "border-red-200 bg-red-50"
                      : ""
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={task.completed}
                        onCheckedChange={() => toggleTaskCompletion(task.id)}
                        className="mt-1"
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h3
                              className={`font-medium ${
                                task.completed
                                  ? "line-through text-muted-foreground"
                                  : ""
                              }`}
                            >
                              {task.title}
                            </h3>
                            {task.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {task.description}
                              </p>
                            )}
                          </div>

                          <div className="flex gap-2 flex-shrink-0">
                            <Badge
                              className={getTypeColor(task.type)}
                              variant="outline"
                            >
                              {task.type}
                            </Badge>
                            <Badge className={getPriorityColor(task.priority)}>
                              {task.priority}
                            </Badge>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span
                              className={
                                isOverdue(task.dueDate, task.completed)
                                  ? "text-red-600 font-medium"
                                  : ""
                              }
                            >
                              {new Date(task.dueDate).toLocaleDateString()}
                              {isOverdue(task.dueDate, task.completed) &&
                                " (Overdue)"}
                            </span>
                          </div>

                          {task.contactName && (
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              <span>{task.contactName}</span>
                              {task.companyName && (
                                <span>({task.companyName})</span>
                              )}
                            </div>
                          )}

                          {task.completed && task.completedAt && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>
                                Completed{" "}
                                {new Date(
                                  task.completedAt
                                ).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-1 flex-shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(task)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(task.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
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
