import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Users, Building2, CheckSquare, Calendar, TrendingUp } from 'lucide-react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { useCloudData } from '../hooks/useCloudData'
import { useAuth } from '../contexts/AuthContext'

export function DashboardView() {
  const { user } = useAuth()
  const [localContacts] = useLocalStorage('crm-contacts', [])
  const [localCompanies] = useLocalStorage('crm-companies', [])
  const [localTasks] = useLocalStorage('crm-tasks', [])
  
  // Use cloud data if authenticated, otherwise use local storage
  const cloudData = useCloudData()
  
  // Filter out any null/undefined values and ensure proper structure
  const contacts = (user ? cloudData.contacts : localContacts)
    .filter(contact => contact != null && typeof contact === 'object')
    .map(contact => ({ ...contact, activities: contact.activities || [] })) // Ensure activities field exists
    
  const companies = (user ? cloudData.companies : localCompanies)
    .filter(company => company != null && typeof company === 'object')
    
  const tasks = (user ? cloudData.tasks : localTasks)
    .filter(task => task != null && typeof task === 'object')

  const stats = [
    {
      title: 'Total Contacts',
      value: contacts.length,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Companies',
      value: companies.length,
      icon: Building2,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Active Tasks',
      value: tasks.filter(task => task && !task.completed).length,
      icon: CheckSquare,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      title: 'This Month',
      value: contacts.filter(contact => {
        if (!contact || !contact.createdAt) return false
        const contactDate = new Date(contact.createdAt)
        const thisMonth = new Date()
        return contactDate.getMonth() === thisMonth.getMonth() && 
               contactDate.getFullYear() === thisMonth.getFullYear()
      }).length,
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    }
  ]

  const recentContacts = contacts
    .filter(contact => contact && contact.createdAt)
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 5)

  const upcomingTasks = tasks
    .filter(task => task && !task.completed && task.dueDate)
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 5)

  return (
    <div className="p-6 space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-semibold">{stat.value}</p>
                </div>
                <div className={`p-2 rounded-full ${stat.bgColor}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

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
            {recentContacts.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No contacts yet</p>
            ) : (
              <div className="space-y-3">
                {recentContacts.map((contact) => contact && (
                  <div key={contact.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium">{contact.firstName || 'Unknown'} {contact.lastName || ''}</p>
                      <p className="text-sm text-muted-foreground">{contact.email || 'No email'}</p>
                    </div>
                    <Badge variant="secondary">{contact.company || 'No Company'}</Badge>
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
            {upcomingTasks.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No upcoming tasks</p>
            ) : (
              <div className="space-y-3">
                {upcomingTasks.map((task) => task && (
                  <div key={task.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium">{task.title || 'Untitled Task'}</p>
                      <p className="text-sm text-muted-foreground">
                        Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}
                      </p>
                    </div>
                    <Badge variant={task.priority === 'high' ? 'destructive' : 'secondary'}>
                      {task.priority || 'medium'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}