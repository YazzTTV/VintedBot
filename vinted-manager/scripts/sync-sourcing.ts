import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import * as dotenv from 'dotenv'
import fs from 'fs/promises'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

dotenv.config()

const connectionString = `${process.env.DATABASE_URL}`
const pool = new pg.Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// Initialisation du client Supabase pour l'upload des images
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  console.log("🚀 Lancement de la synchronisation de l'Historique de Sourcing...")
  
  try {
    const accountsDir = path.join(process.cwd(), '..', 'Accounts')
    console.log(`📂 Analyse du dossier : ${accountsDir}`)
    
    await fs.access(accountsDir)
    const entries = await fs.readdir(accountsDir, { withFileTypes: true })
    const folders = entries.filter(d => d.isDirectory()).map(d => d.name)
    
    console.log(`👥 Comptes bots détectés : [ ${folders.join(', ')} ]`)
    
    let totalParsed = 0
    let totalUpserted = 0
    let totalImagesUploaded = 0

    for (const account of folders) {
      const historyPath = path.join(accountsDir, account, 'Sourcing_History.md')
      
      try {
        await fs.access(historyPath)
        const content = await fs.readFile(historyPath, 'utf-8')
        const lines = content.split('\n')
        
        let countPerAccount = 0
        
        for (const line of lines) {
          const cleanLine = line.trim()
          // Filtre sur le tableau Markdown
          if (!cleanLine.startsWith('|') || cleanLine.includes('Statut |') || cleanLine.includes(':---')) {
            continue
          }

          const cols = cleanLine.split('|').map(c => c.trim())
          if (cols.length < 6) continue

          const titleRaw = cols[3] || ''
          const title = titleRaw.replace(/\*\*/g, '').trim()

          const linkRaw = cols[4] || ''
          const urlMatch = linkRaw.match(/\((https?:\/\/[^)]+)\)/)
          const url = urlMatch ? urlMatch[1] : ''

          const ficheRaw = cols[5] || ''
          const fiche = ficheRaw.replace(/[\[\]]/g, '').trim()

          if (title && url) {
            // Normalisation de l'URL pour éviter les doublons avec paramètres de tracking
            let normalizedUrl = url
            try {
              const u = new URL(url)
              normalizedUrl = u.origin + u.pathname
            } catch (e) {}

            totalParsed++
            
            // 🚀 RECHERCHE ET UPLOAD DE L'IMAGE (AVEC FALLBACK)
            let uploadedImageUrl = null
            try {
              const archiveDir = path.join(accountsDir, account, 'Products_Archive', fiche)
              
              // Liste des images par ordre de priorité
              const priorityImages = [
                'flat_lay_upscaled.jpg',
                'flat_lay_upscaled.png',
                'selfie_upscaled.jpg',
                'selfie_upscaled.png',
                'flat_lay.jpg',
                'selfie.jpg'
              ]
              
              let imageToUpload = null

              // 1. Chercher dans les images traitées par priorité
              for (const imgName of priorityImages) {
                const fullPath = path.join(archiveDir, imgName)
                const exists = await fs.access(fullPath).then(() => true).catch(() => false)
                if (exists) {
                  imageToUpload = fullPath
                  break
                }
              }

              // 2. Fallback ultime : chercher n'importe quel fichier "original_*.png/jpg"
              if (!imageToUpload) {
                const files = await fs.readdir(archiveDir).catch(() => [])
                const originalFile = files.find(f => f.startsWith('original_'))
                if (originalFile) {
                  imageToUpload = path.join(archiveDir, originalFile)
                }
              }
              
              if (imageToUpload) {
                const imageBuffer = await fs.readFile(imageToUpload)
                const ext = path.extname(imageToUpload).toLowerCase()
                
                // Sanitisation du nom de fichier pour Supabase Storage
                const safeFiche = fiche.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9_-]/g, "_")
                const storageFileName = `${account}/${safeFiche}/preview${ext}`
                
                const { error: uploadError } = await supabase.storage
                  .from('sourcing-images')
                  .upload(storageFileName, imageBuffer, {
                    contentType: ext === '.png' ? 'image/png' : 'image/jpeg',
                    upsert: true
                  })

                if (!uploadError) {
                  const { data: publicUrlData } = supabase.storage
                    .from('sourcing-images')
                    .getPublicUrl(storageFileName)
                  uploadedImageUrl = publicUrlData.publicUrl
                  totalImagesUploaded++
                } else {
                  console.log(`⚠️  Erreur upload Supabase pour ${title}:`, uploadError.message)
                }
              }
            } catch (imgErr: any) {
              // Ignore silencieusement
            }

            // Upsert atomique dans la base de données cloud Supabase
            await prisma.sourcingProduct.upsert({
              where: { 
                account_url: {
                  account: account,
                  url: normalizedUrl
                }
              },
              update: {
                title: title,
                fiche: fiche,
                account: account,
                imageUrl: uploadedImageUrl || undefined
              },
              create: {
                url: normalizedUrl,
                title: title,
                fiche: fiche,
                account: account,
                imageUrl: uploadedImageUrl
              }
            })
            
            countPerAccount++
            totalUpserted++
          }
        }
        console.log(`✅ ${account.padEnd(10)} : ${countPerAccount} produits synchronisés.`)
      } catch (err: any) {
        console.log(`ℹ️  ${account.padEnd(10)} : Erreur rencontrée ->`, err.message)
      }
    }

    console.log(`\n✨ SYNCHRONISATION TERMINÉE AVEC SUCCÈS ! ✨`)
    console.log(`📊 Total parcouru  : ${totalParsed} articles`)
    console.log(`⚡ Total synchronisé : ${totalUpserted} articles dans la DB Cloud`)
    console.log(`🖼️  Total images     : ${totalImagesUploaded} uploads réussis`)

  } catch (error: any) {
    console.error("\n❌ Erreur Critique lors de la synchronisation :", error.message)
  } finally {
    await prisma.$disconnect()
  }
}

main()
