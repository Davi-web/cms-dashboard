import { useState, useEffect } from 'react'
import { apiClient, type Contact, type Company, type Task } from '../utils/api'
import { useAuth } from '../contexts/AuthContext'


// Convert snake_case → camelCase
const toCamelCase = (obj: any) => {
  const result: any = {};
  for (const key in obj) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = obj[key];
  }
  return result;
};

// Convert array of objects
const toCamelCaseArray = (arr: any[]) => arr.map(toCamelCase);


export function useCloudData() {
  const { user } = useAuth()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load all data
  const loadData = async () => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      const [contactsRes, companiesRes, tasksRes] = await Promise.all([
        apiClient.getContacts(),
        apiClient.getCompanies(),
        apiClient.getTasks()
      ])
      console.log('Fetched cloud data:', { contactsRes, companiesRes, tasksRes })
      const contacts = toCamelCaseArray(contactsRes.contacts)
      const companies = toCamelCaseArray(companiesRes.companies)
      const tasks = toCamelCaseArray(tasksRes.tasks)


      setContacts(contacts || [])
      setCompanies(companies || [])
      setTasks(tasks|| [])
    } catch (error: any) {
      console.error('Error loading data:', error)
      setError(error.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  // Load data when user changes
  useEffect(() => {
    if (user) {
      loadData()
    } else {
      setContacts([])
      setCompanies([])
      setTasks([])
    }
  }, [user])

  // console.log(contacts, companies, tasks)s
  // Contact operations
  const addContact = async (contactData: Omit<Contact, 'id' | 'createdAt' | 'lastContact'>) => {
    try {
      const { contact } = await apiClient.createContact(contactData)
      console.log('Created contact:', contact)
      setContacts(prev => [...prev, toCamelCase(contact)])
      return contact
    } catch (error: any) {
      console.error('Error creating contact:', error, contactData)
      throw error
    }
  }

  const updateContact = async (id: string, updates: Partial<Contact>) => {
    try {
      const { contact } = await apiClient.updateContact(id, updates)
      setContacts(prev => prev.map(c => c.id === id ? toCamelCase(contact) : c))
      return contact
    } catch (error: any) {
      console.error('Error updating contact:', error)
      throw error
    }
  }

  const deleteContact = async (id: string) => {
    try {
      await apiClient.deleteContact(id)
      setContacts(prev => prev.filter(c => c.id !== id))
    } catch (error: any) {
      console.error('Error deleting contact:', error)
      throw error
    }
  }

  // Company operations
  const addCompany = async (companyData: Omit<Company, 'id' | 'createdAt'>) => {
    try {
      const { company } = await apiClient.createCompany(companyData)
      console.log('Created company:', company)
      setCompanies(prev => [...prev, toCamelCase(company)])
      return company
    } catch (error: any) {
      console.error('Error creating company:', error)
      throw error
    }
  }

  const updateCompany = async (id: string, updates: Partial<Company>) => {
    try {
      const { company } = await apiClient.updateCompany(id, updates)
      setCompanies(prev => prev.map(c => c.id === id ? toCamelCase(company) : c))
      return company
    } catch (error: any) {
      console.error('Error updating company:', error)
      throw error
    }
  }

  const deleteCompany = async (id: string) => {
    try {
      await apiClient.deleteCompany(id)
      setCompanies(prev => prev.filter(c => c.id !== id))
    } catch (error: any) {
      console.error('Error deleting company:', error)
      throw error
    }
  }

  // Task operations
  const addTask = async (taskData: Omit<Task, 'id' | 'createdAt'>) => {
    try {
      const { task } = await apiClient.createTask(taskData)
      setTasks(prev => [...prev, toCamelCase(task)])
      return task
    } catch (error: any) {
      console.error('Error creating task:', error)
      throw error
    }
  }

  const updateTask = async (id: string, updates: Partial<Task>) => {
    try {
      const { task } = await apiClient.updateTask(id, updates)
      setTasks(prev => prev.map(t => t.id === id ? toCamelCase(task) : t))
      return task
    } catch (error: any) {
      console.error('Error updating task:', error)
      throw error
    }
  }

  const deleteTask = async (id: string) => {
    try {
      await apiClient.deleteTask(id)
      setTasks(prev => prev.filter(t => t.id !== id))
    } catch (error: any) {
      console.error('Error deleting task:', error)
      throw error
    }
  }

  return {
    // Data
    contacts,
    companies,
    tasks,
    loading,
    error,
    
    // Operations
    loadData,
    
    // Contact operations
    addContact,
    updateContact,
    deleteContact,
    
    // Company operations
    addCompany,
    updateCompany,
    deleteCompany,
    
    // Task operations
    addTask,
    updateTask,
    deleteTask,
  }
}