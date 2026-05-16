"use client"

import React, { useState, useRef } from "react"
import { FileUp, FileCheck, X, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface LabelDropzoneProps {
  onFileSelected: (file: File | null, extractedNumber: string) => void
  className?: string
}

export default function LabelDropzone({ onFileSelected, className }: LabelDropzoneProps) {
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Fonction d'extraction intelligente du N° Bordereau
  const extractTrackingNumber = (filename: string): string => {
    // Extraction d'une chaîne de 8 à 16 chiffres consécutifs (standard Vinted/Mondial Relay)
    const match = filename.match(/\d{8,16}/)
    return match ? match[0] : ""
  }

  const processFile = (file: File) => {
    setError(null)
    
    // Validation du type (uniquement PDF)
    if (file.type !== "application/pdf") {
      setError("Format incorrect : seul le format PDF est autorisé.")
      return
    }

    // Validation de la taille (Max 10 Mo)
    if (file.size > 10 * 1024 * 1024) {
      setError("Fichier trop volumineux (Max 10 Mo).")
      return
    }

    setSelectedFile(file)
    const extracted = extractTrackingNumber(file.name)
    onFileSelected(file, extracted)
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0])
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0])
    }
  }

  const handleRemove = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setSelectedFile(null)
    if (inputRef.current) inputRef.current.value = ""
    onFileSelected(null, "")
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "border border-dashed rounded-xl p-6 flex flex-col items-center justify-center transition-all duration-200 relative cursor-pointer bg-zinc-900/30 min-h-[140px]",
          dragActive 
            ? "border-blue-500 bg-blue-500/5 scale-[1.01]" 
            : "border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/50",
          selectedFile ? "border-emerald-500/50 bg-emerald-500/5" : "",
          error ? "border-rose-500/50 bg-rose-500/5" : ""
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handleChange}
        />

        {selectedFile ? (
          <div className="flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200 w-full relative">
            <button
              onClick={handleRemove}
              className="absolute -top-2 right-0 p-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              title="Retirer le fichier"
            >
              <X className="w-4 h-4" />
            </button>
            
            <div className="p-3 bg-emerald-500/10 rounded-full text-emerald-400 mb-2">
              <FileCheck className="w-6 h-6" />
            </div>
            <span className="text-sm text-emerald-400 font-medium truncate max-w-[85%] px-2">
              {selectedFile.name}
            </span>
            <span className="text-[10px] text-zinc-500 mt-1 flex items-center gap-1">
              {(selectedFile.size / 1024).toFixed(0)} Ko • Cliquez pour remplacer
            </span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center text-center animate-in fade-in duration-200">
            <div className="p-3 bg-rose-500/10 rounded-full text-rose-400 mb-2">
              <AlertCircle className="w-6 h-6" />
            </div>
            <span className="text-sm text-rose-400 font-medium">{error}</span>
            <span className="text-[10px] text-zinc-500 mt-1">Cliquez pour réessayer</span>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center">
            <div className="p-3 bg-zinc-800/50 rounded-full text-zinc-400 mb-2 group-hover:text-zinc-200 transition-colors">
              <FileUp className="w-6 h-6" />
            </div>
            <span className="text-sm text-zinc-300 font-medium">Glissez le PDF ici</span>
            <span className="text-[10px] text-zinc-500 mt-1">Ou cliquez pour parcourir</span>
          </div>
        )}
      </div>
    </div>
  )
}
