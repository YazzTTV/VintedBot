import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
// Utilisation de SERVICE ROLE KEY obligatoire côté API route pour pouvoir outrepasser les politiques RLS
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Les variables d'environnement Supabase ne sont pas configurées correctement.")
}

// Client d'administration serveur (Ne jamais importer ce fichier dans un composant "use client")
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
})
