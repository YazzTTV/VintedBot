import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    // Parallel metrics fetching for performance
    const [aggregateSales, stockCount, last7DaysVentes, realAlerts, botStats, botList] = await Promise.all([
      // 1. Global Sales Statistics
      prisma.vente.aggregate({
        _sum: {
          prixVente: true,
          beneficeNet: true
        },
        _avg: {
          margePct: true
        }
      }),
      // 2. Live Items still in supply
      prisma.article.count({
        where: { statut: 'STOCK' }
      }),
      // 3. Dynamic time series data for the UI charts
      prisma.vente.findMany({
        take: 100, // fetch last 100 sales to group
        orderBy: { dateVente: 'desc' },
        select: {
          dateVente: true,
          prixVente: true,
          beneficeNet: true
        }
      }),
      // 4. Fetch real shipping alerts (Pending sales)
      prisma.vente.findMany({
        where: { statut: 'EN_ATTENTE' },
        take: 5, // Just need top urgent ones for dash
        orderBy: { dateLimiteExpedition: 'asc' },
        include: { article: true }
      }),
      // 5. Aggregated Real Bot Balances (Supabase real sync)
      prisma.botAccount.aggregate({
        _sum: {
          balancePending: true,
          balanceAvailable: true
        }
      }),
      // 6. Individual list of Bots for the detailed grid
      prisma.botAccount.findMany({
        orderBy: { name: 'asc' }
      })
    ])

    // Calculate dynamic urgency levels for front-end display
    const now = new Date()
    const alertesExpeditions = realAlerts.map(v => {
      const limit = v.dateLimiteExpedition ? new Date(v.dateLimiteExpedition) : null
      let deadlineStr = 'Non précisé'
      let urgency = 'low'
      
      if (limit) {
        const diffMs = limit.getTime() - now.getTime()
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
        
        if (diffHours <= 0) {
          deadlineStr = "RETARD !"
          urgency = 'high'
        } else if (diffHours <= 24) {
          deadlineStr = `Il reste ${diffHours}h`
          urgency = 'high'
        } else if (diffHours <= 48) {
          deadlineStr = "Sous 48h"
          urgency = 'medium'
        } else {
          deadlineStr = limit.toLocaleDateString('fr-FR')
          urgency = 'low'
        }
      }

      return {
        id: v.id,
        label: `Article #${v.article.id.substring(0,5)}`, // generic for now unless they name items
        buyer: v.pseudoAcheteur,
        deadline: deadlineStr,
        urgency: urgency
      }
    })

    // Construct chart data structure (grouped by date format)
    // Note: For a small app, grouping results programmatically is highly efficient
    const salesByDate: Record<string, { sales: number, profit: number }> = {}
    
    // Take current date minus 6 days for the dynamic week layout
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toLocaleDateString('fr-FR', { weekday: 'short' }) // Lun, Mar...
      salesByDate[key] = { sales: 0, profit: 0 }
    }

    // Fill map with real DB data
    last7DaysVentes.forEach(v => {
      const key = new Date(v.dateVente).toLocaleDateString('fr-FR', { weekday: 'short' })
      if (salesByDate[key]) {
        salesByDate[key].sales += Number(v.prixVente)
        salesByDate[key].profit += Number(v.beneficeNet)
      }
    })

    // Map to Recharts ready object array
    const chartData = Object.entries(salesByDate).map(([date, vals]) => ({
      date,
      sales: Number(vals.sales.toFixed(2)),
      profit: Number(vals.profit.toFixed(2))
    }))

    // Compose final payload
    return NextResponse.json({
      success: true,
      data: {
        caTotal: Number(aggregateSales._sum.prixVente || 0),
        beneficeTotal: Number(aggregateSales._sum.beneficeNet || 0),
        margeMoyenne: Number(aggregateSales._avg.margePct || 0),
        articlesEnStock: stockCount,
        chartData: chartData,
        alertesExpeditions: alertesExpeditions,
        
        // Nouvelles Métriques Unifiées (Phase 2)
        totalWalletPending: Number(botStats._sum.balancePending || 0),
        totalWalletAvailable: Number(botStats._sum.balanceAvailable || 0),
        bots: botList.map(bot => ({
          id: bot.id,
          name: bot.name,
          vintedUsername: bot.vintedUsername,
          vintedAccountId: bot.vintedAccountId,
          balancePending: Number(bot.balancePending || 0),
          balanceAvailable: Number(bot.balanceAvailable || 0),
          lastSync: bot.lastSync
        }))
      }
    })

  } catch (error: any) {
    console.error('Dashboard Stat Failure:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
