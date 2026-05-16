import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // Déterminer le chemin absolu pour sauvegarder à la racine du projet
    const targetPath = path.join(process.cwd(), 'vinted_api_capture.json')
    
    console.log(`💾 [CAPTURE] Écriture des données brutes de l'API vers ${targetPath}`)
    
    fs.writeFileSync(targetPath, JSON.stringify(body, null, 2), 'utf-8')
    
    return NextResponse.json({ 
      success: true, 
      message: `Capture sauvegardée avec succès dans le projet local !`,
      path: targetPath
    }, { headers: corsHeaders })

  } catch (error: any) {
    console.error("❌ [CAPTURE] Échec de sauvegarde :", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders })
  }
}
