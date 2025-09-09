import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { createClient } from '@supabase/supabase-js'
import { projectId, publicAnonKey } from '../utils/supabase/info'
import { apiClient } from '../utils/api'

const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey
)

interface User {
  id: string
  email: string
  firstName?: string
  lastName?: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ success: boolean, error?: string }>
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{ success: boolean, error?: string }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for existing session
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        console.log('Existing session:', session, error);
        
        if (session?.access_token && !error) {
          const userData = {
            id: session.user.id,
            email: session.user.email!,
            firstName: session.user.user_metadata?.firstName,
            lastName: session.user.user_metadata?.lastName,
          }
          setUser(userData)
          apiClient.setAccessToken(session.access_token)
        }
      } catch (error) {
        console.error('Session check error:', error)
      } finally {
        setLoading(false)
      }
    }

    checkSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session);
        if (session?.access_token) {
          const userData = {
            id: session.user.id,
            email: session.user.email!,
            firstName: session.user.user_metadata?.firstName,
            lastName: session.user.user_metadata?.lastName,
          }
          setUser(userData)
          apiClient.setAccessToken(session.access_token)
        } else {
          setUser(null)
          apiClient.setAccessToken(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      console.log('Sign in data:', data, 'error:', error);

      if (error) {
        return { success: false, error: error.message }
      }

      if (data.session?.access_token) {
        const userData = {
          id: data.user.id,
          email: data.user.email!,
          firstName: data.user.user_metadata?.firstName,
          lastName: data.user.user_metadata?.lastName,
        }
        setUser(userData)
        apiClient.setAccessToken(data.session.access_token)
      }

      return { success: true }
    } catch (error) {
      console.error('Sign in error:', error)
      return { success: false, error: 'Sign in failed. Please try again.' }
    }
  }

  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    try {
      // Use our custom signup endpoint that auto-confirms email
      console.log('Signing up:', email, firstName, lastName, password);
      const result = await apiClient.signup(email, password, firstName, lastName)
      console.log('Signup result:', result);
      
      if (result.user) {
        // Now sign in the user
        const signInResult = await signIn(email, password)
        return signInResult
      }

      return { success: false, error: 'Failed to create account' }
    } catch (error: any) {
      console.error('Sign up error:', error)
      return { success: false, error: error.message || 'Sign up failed. Please try again.' }
    }
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
      apiClient.setAccessToken(null)
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}