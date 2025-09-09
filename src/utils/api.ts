import { projectId, publicAnonKey } from "./supabase/info";

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/server`;

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

// Convert camelCase → snake_case
const toSnakeCase = (obj: any) => {
  const result: any = {};
  for (const key in obj) {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    result[snakeKey] = obj[key];
  }
  return result;
};

class ApiClient {
  private accessToken: string | null = null;

  setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${BASE_URL}${endpoint}`;

    const headers = {
      "Content-Type": "application/json",
      Authorization: this.accessToken
        ? `Bearer ${this.accessToken}`
        : `Bearer ${publicAnonKey}`,
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Network error" }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      throw error;
    }
  }

  // Auth methods
  async signup(
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ) {
    console.log("API signup called:", email, firstName, lastName, password);
    return this.request("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password, firstName, lastName }),
    });
  }

  // Contact methods
  async getContacts(): Promise<{ contacts: Contact[] }> {
    return this.request("/contacts");
  }

  
  async createContact(
    contact: Omit<Contact, "id" | "createdAt" | "lastContact">
  ): Promise<{ contact: Contact }> {
    return this.request("/contacts", {
      method: "POST",
      body: JSON.stringify(toSnakeCase(contact)),
    });
  }

  async updateContact(
    id: string,
    updates: Partial<Contact>
  ): Promise<{ contact: Contact }> {
    return this.request(`/contacts/${id}`, {
      method: "PUT",
      body: JSON.stringify(toSnakeCase(updates)),
    });
  }

  async deleteContact(id: string): Promise<{ success: boolean }> {
    return this.request(`/contacts/${id}`, {
      method: "DELETE",
    });
  }

  // Company methods
  async getCompanies(): Promise<{ companies: Company[] }> {
    return this.request("/companies");
  }

  async createCompany(
    company: Omit<Company, "id" | "createdAt">
  ): Promise<{ company: Company }> {
    return this.request("/companies", {
      method: "POST",
      body: JSON.stringify(toSnakeCase(company)),
    });
  }

  async updateCompany(
    id: string,
    updates: Partial<Company>
  ): Promise<{ company: Company }> {
    return this.request(`/companies/${id}`, {
      method: "PUT",
      body: JSON.stringify(toSnakeCase(updates)),
    });
  }

  async deleteCompany(id: string): Promise<{ success: boolean }> {
    return this.request(`/companies/${id}`, {
      method: "DELETE",
    });
  }

  // Task methods
  async getTasks(): Promise<{ tasks: Task[] }> {
    return this.request("/tasks");
  }

  async createTask(
    task: Omit<Task, "id" | "createdAt">
  ): Promise<{ task: Task }> {
    return this.request("/tasks", {
      method: "POST",
      body: JSON.stringify(toSnakeCase(task)),
    });
  }

  async updateTask(
    id: string,
    updates: Partial<Task>
  ): Promise<{ task: Task }> {
    return this.request(`/tasks/${id}`, {
      method: "PUT",
      body: JSON.stringify(toSnakeCase(updates)),
    });
  }

  async deleteTask(id: string): Promise<{ success: boolean }> {
    return this.request(`/tasks/${id}`, {
      method: "DELETE",
    });
  }

  // Sync method for migrating local data
  async syncData(data: {
    contacts?: Contact[];
    companies?: Company[];
    tasks?: Task[];
  }): Promise<{ success: boolean; message: string }> {
    return this.request("/sync", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // Health check
  async healthCheck() {
    return this.request("/health");
  }
}

export const apiClient = new ApiClient();
export type { Contact, Company, Task, Activity };
