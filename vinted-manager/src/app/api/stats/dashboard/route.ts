import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'global'

    // Filtre compte (botAccountId). "all"/absent => tous les comptes.
    const accountParam = searchParams.get('account')
    const accountId = accountParam && accountParam !== 'all' ? accountParam : null
    const venteAccountWhere: any = accountId ? { botAccountId: accountId } : {}

    // Plancher d'activité : rien avant le 1er mai 2026 (mai = index 4).
    // Élimine les données de test antérieures, y compris en vue "Global".
    const BUSINESS_START = new Date(2026, 4, 1)

    const now = new Date()
    let startDate: Date
    if (period === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    } else if (period === '15d') {
      startDate = new Date(now); startDate.setDate(startDate.getDate() - 15)
    } else if (period === '30d') {
      startDate = new Date(now); startDate.setDate(startDate.getDate() - 30)
    } else if (period === '90d') {
      startDate = new Date(now); startDate.setDate(startDate.getDate() - 90)
    } else if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    } else {
      startDate = new Date(BUSINESS_START) // global => depuis le début d'activité
    }
    // Plancher d'activité appliqué à TOUTES les périodes.
    if (startDate < BUSINESS_START) startDate = new Date(BUSINESS_START)

    const dateFilterVentes: any = { gte: startDate }
    const dateFilterCommandes: any = { gte: startDate }

    // Fenêtre du graphique dynamique selon la période
    let chartDays = 6
    if (period === '15d') chartDays = 14
    else if (period === '30d') chartDays = 29
    else if (period === '90d') chartDays = 89
    else if (period === 'month') chartDays = Math.max(0, now.getDate() - 1)

    let chartStartDate = new Date(now)
    chartStartDate.setDate(chartStartDate.getDate() - chartDays)
    chartStartDate.setHours(0, 0, 0, 0)
    if (chartStartDate < BUSINESS_START) chartStartDate = new Date(BUSINESS_START)

    // Parallel metrics fetching for performance
    const [aggregateSales, aggregateExpenses, stockCount, chartVentes, realAlerts, botStats, botList, commandesAFaireData] = await Promise.all([
      // 1. Global Sales Statistics (hors annulations)
      prisma.vente.aggregate({
        where: {
          dateVente: dateFilterVentes,
          ...venteAccountWhere,
          statut: { not: 'ANNULEE' }
        },
        _sum: {
          prixVente: true,
          beneficeNet: true
        },
        _avg: {
          margePct: true
        }
      }),
      // 2. Global Supplier Expenses (prixTotal of all orders)
      prisma.commandeFournisseur.aggregate({
        where: { dateCommande: dateFilterCommandes },
        _sum: {
          prixTotal: true
        }
      }),
      // 3. Live Items still in supply
      prisma.article.count({
        where: { statut: 'STOCK' }
      }),
      // 4. Dynamic time series data for the UI charts (hors annulations)
      prisma.vente.findMany({
        where: { dateVente: { gte: chartStartDate }, ...venteAccountWhere, statut: { not: 'ANNULEE' } },
        orderBy: { dateVente: 'desc' },
        select: {
          dateVente: true,
          prixVente: true,
          beneficeNet: true
        }
      }),
      // 5. Fetch real shipping alerts (Pending sales)
      prisma.vente.findMany({
        where: { statut: 'EN_ATTENTE', ...venteAccountWhere },
        take: 5, // Just need top urgent ones for dash
        orderBy: { dateLimiteExpedition: 'asc' },
        include: { article: true }
      }),
      // 6. Aggregated Real Bot Balances (Supabase real sync)
      prisma.botAccount.aggregate({
        where: accountId ? { id: accountId } : undefined,
        _sum: {
          balancePending: true,
          balanceAvailable: true
        }
      }),
      // 7. Individual list of Bots for the detailed grid
      prisma.botAccount.findMany({
        orderBy: { name: 'asc' }
      }),
      // 8. Commandes à faire
      prisma.vente.findMany({
        where: { statut: 'COMMANDE_A_FAIRE', ...venteAccountWhere },
        include: { article: true },
        orderBy: { dateVente: 'desc' }
      })
    ])

    // Calculate dynamic urgency levels for front-end display
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

    // Construct chart data structure (grouped by date, window = chartDays + 1 days)
    const salesByDate: Record<string, { displayDate: string, sales: number, profit: number }> = {}

    for (let i = chartDays; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const uniqueKey = d.toISOString().split('T')[0]
      const displayKey = chartDays > 6
        ? d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
        : d.toLocaleDateString('fr-FR', { weekday: 'short' })
      salesByDate[uniqueKey] = { displayDate: displayKey, sales: 0, profit: 0 }
    }

    // Fill map with real DB data
    chartVentes.forEach(v => {
      const vDate = new Date(v.dateVente)
      const uniqueKey = vDate.toISOString().split('T')[0]
      if (salesByDate[uniqueKey]) {
        salesByDate[uniqueKey].sales += Number(v.prixVente)
        salesByDate[uniqueKey].profit += Number(v.beneficeNet)
      }
    })

    // Map to Recharts ready object array
    const chartData = Object.values(salesByDate).map((vals) => ({
      date: vals.displayDate,
      "CA (€)": Number(vals.sales.toFixed(2)),
      "Bénéfice (€)": Number(vals.profit.toFixed(2))
    }))

    const totalPurchase = commandesAFaireData.reduce((acc, v) => acc + Number(v.purchasePriceSnapshot || 0), 0)
    const globalShipping = totalPurchase > 39 ? 0 : 3.90
    const shippingPerItem = commandesAFaireData.length > 0 ? globalShipping / commandesAFaireData.length : 0

    const commandesAFaire = commandesAFaireData.map(v => {
       const purchasePrice = Number(v.purchasePriceSnapshot || 0)
       const shippingCost = shippingPerItem
       const estimatedProfit = Number(v.prixVente) - purchasePrice - shippingCost - Number(v.fraisVinted)
       return {
         id: v.id,
         title: v.article?.nom || `Article #${v.articleId.substring(0,5)}`,
         buyer: v.pseudoAcheteur,
         price: Number(v.prixVente).toFixed(2),
         purchasePrice: purchasePrice.toFixed(2),
         estimatedProfit: estimatedProfit.toFixed(2)
       }
    })

    // Compose final payload
    return NextResponse.json({
      success: true,
      data: {
        accountFiltered: !!accountId,
        commandesAFaire,
        chartPeriodDays: chartDays + 1,
        caTotal: Number(aggregateSales._sum.prixVente || 0),
        beneficeTotal: Number(aggregateSales._sum.beneficeNet || 0),
        margeMoyenne: Number(aggregateSales._avg.margePct || 0),
        articlesEnStock: stockCount,
        totalExpenses: Number(aggregateExpenses._sum.prixTotal || 0),
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
