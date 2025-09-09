import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react'
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
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{ success: boolean; error?: string }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const lastToken = useRef<string | null>(null)

  const handleSession = (session: any | null) => {
    const token = session?.access_token || null
    if (token === lastToken.current) return // Skip if token hasn't changed
    lastToken.current = token

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
  }

  useEffect(() => {
    const initSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) console.error("Session load error:", error)
      handleSession(session)
      setLoading(false)
    }

    initSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth event:", event, session)
      handleSession(session)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) return { success: false, error: error.message }
      handleSession(data.session)
      return { success: true }
    } catch (error) {
      console.error("Sign in error:", error)
      return { success: false, error: "Sign in failed. Please try again." }
    }
  }

  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    try {
      const result = await apiClient.signup(email, password, firstName, lastName)
      if (result.user) return await signIn(email, password)
      return { success: false, error: "Failed to create account" }
    } catch (error: any) {
      console.error("Sign up error:", error)
      return { success: false, error: error.message || "Sign up failed. Please try again." }
    }
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      handleSession(null)
    } catch (error) {
      console.error("Sign out error:", error)
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
  if (!context) throw new Error("useAuth must be used within an AuthProvider")
  return context
}
