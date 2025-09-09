import { useState } from 'react'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Alert, AlertDescription } from './ui/alert'
import { Progress } from './ui/progress'
import { CheckCircle, AlertCircle, Cloud, HardDrive } from 'lucide-react'
import { apiClient } from '../utils/api'

interface DataSyncDialogProps {
  open: boolean
  onClose: () => void
  localContacts: any[]
  localCompanies: any[]
  localTasks: any[]
  onSyncComplete: () => void
}

export function DataSyncDialog({ 
  open, 
  onClose, 
  localContacts, 
  localCompanies, 
  localTasks, 
  onSyncComplete 
}: DataSyncDialogProps) {
  const [syncing, setSyncing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const totalItems = localContacts.length + localCompanies.length + localTasks.length

  const handleSync = async () => {
    if (totalItems === 0) {
      setError('No local data found to sync')
      return
    }

    setSyncing(true)
    setError('')
    setSuccess(false)
    setProgress(0)

    try {
      setProgress(25)
      
      const result = await apiClient.syncData({
        contacts: localContacts,
        companies: localCompanies,
        tasks: localTasks
      })

      setProgress(75)

      if (result.success) {
        setProgress(100)
        setSuccess(true)
        setTimeout(() => {
          onSyncComplete()
          onClose()
        }, 2000)
      } else {
        throw new Error('Sync failed')
      }
    } catch (error: any) {
      console.error('Sync error:', error)
      setError(error.message || 'Failed to sync data. Please try again.')
    } finally {
      setSyncing(false)
    }
  }

  const handleSkip = () => {
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Sync Local Data
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">
              We found {totalItems} items in your local storage. Would you like to sync them to the cloud?
            </p>
            
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center p-3 rounded-lg bg-blue-50">
                <HardDrive className="h-6 w-6 mx-auto mb-1 text-blue-600" />
                <p className="text-sm font-medium">{localContacts.length}</p>
                <p className="text-xs text-muted-foreground">Contacts</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-green-50">
                <HardDrive className="h-6 w-6 mx-auto mb-1 text-green-600" />
                <p className="text-sm font-medium">{localCompanies.length}</p>
                <p className="text-xs text-muted-foreground">Companies</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-orange-50">
                <HardDrive className="h-6 w-6 mx-auto mb-1 text-orange-600" />
                <p className="text-sm font-medium">{localTasks.length}</p>
                <p className="text-xs text-muted-foreground">Tasks</p>
              </div>
            </div>
          </div>

          {syncing && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Cloud className="h-4 w-4 animate-pulse" />
                <span className="text-sm">Syncing data to cloud...</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          {success && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Data synced successfully! Your data is now available across all devices.
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button 
              onClick={handleSync} 
              disabled={syncing || success || totalItems === 0}
              className="flex-1"
            >
              {syncing ? 'Syncing...' : 'Sync Data'}
            </Button>
            <Button 
              variant="outline" 
              onClick={handleSkip}
              disabled={syncing}
            >
              Skip
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Your local data will remain unchanged. This creates a cloud backup and enables sync across devices.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}