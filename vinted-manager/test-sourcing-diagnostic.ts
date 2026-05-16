import fs from 'fs/promises'
import path from 'path'

async function main() {
  try {
    const accountsDir = path.join(process.cwd(), '..', 'Accounts')
    console.log("Looking in:", accountsDir)
    
    await fs.access(accountsDir)
    const entries = await fs.readdir(accountsDir, { withFileTypes: true })
    const folders = entries.filter(d => d.isDirectory()).map(d => d.name)
    
    console.log("Found folders:", folders)
    
    for (const acc of folders) {
      const p = path.join(accountsDir, acc, 'Sourcing_History.md')
      try {
        await fs.access(p)
        const content = await fs.readFile(p, 'utf-8')
        console.log(`Successfully read ${acc}/Sourcing_History.md (${content.length} bytes)`)
        
        const lines = content.split('\n')
        let parseCount = 0
        for (const line of lines) {
          const cleanLine = line.trim()
          if (!cleanLine.startsWith('|') || cleanLine.includes('Statut |') || cleanLine.includes(':---')) continue
          
          const cols = cleanLine.split('|').map(c => c.trim())
          if (cols.length < 5) continue
          
          const titleRaw = cols[3] || ''
          const title = titleRaw.replace(/\*\*/g, '').trim()
          const linkRaw = cols[4] || ''
          const urlMatch = linkRaw.match(/\((https?:\/\/[^)]+)\)/)
          const url = urlMatch ? urlMatch[1] : ''
          const ficheRaw = cols[5] || ''
          const fiche = ficheRaw.replace(/[\[\]]/g, '').trim()
          
          if (title && url) parseCount++
        }
        console.log(`parsed ${parseCount} products for ${acc}`)
      } catch (e: any) {
        console.log(`Error reading ${acc}:`, e.message)
      }
    }
  } catch (e: any) {
    console.error("Global crash:", e.message)
  }
}

main()
