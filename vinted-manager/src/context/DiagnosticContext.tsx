"use client"

import React, { createContext, useContext, useState, useEffect } from 'react'

interface DiagnosticContextType {
  diagLogs: string[]
  addDiagLog: (msg: string) => void
  clearDiagLogs: () => void
  isDiagConsoleOpen: boolean
  setIsDiagConsoleOpen: (open: boolean) => void
}

const DiagnosticContext = createContext<DiagnosticContextType | undefined>(undefined)

export function DiagnosticProvider({ children }: { children: React.ReactNode }) {
  const [diagLogs, setDiagLogs] = useState<string[]>([])
  const [isDiagConsoleOpen, setIsDiagConsoleOpen] = useState(false)

  const addDiagLog = (msg: string) => {
    const time = new Date().toLocaleTimeString()
    setDiagLogs(prev => [...prev, `[${time}] ${msg}`])
  }

  const clearDiagLogs = () => setDiagLogs([])

  // Capture global JS errors
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      addDiagLog(`❌ ERREUR JS : ${event.message} (${event.filename}:${event.lineno})`)
    }
    window.addEventListener('error', handleError)
    return () => window.removeEventListener('error', handleError)
  }, [])

  return (
    <DiagnosticContext.Provider value={{ 
      diagLogs, 
      addDiagLog, 
      clearDiagLogs, 
      isDiagConsoleOpen, 
      setIsDiagConsoleOpen 
    }}>
      {children}
    </DiagnosticContext.Provider>
  )
}

export function useDiagnostic() {
  const context = useContext(DiagnosticContext)
  if (context === undefined) {
    throw new Error('useDiagnostic must be used within a DiagnosticProvider')
  }
  return context
}
