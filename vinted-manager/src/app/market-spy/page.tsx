'use client'

import React, { useState, useEffect } from 'react'
import { RefreshCw, Trash2, Plus } from 'lucide-react'

interface SpyLikedItem {
  id: string
  itemId: string
  title: string
  price: number
  categoryId: number
  categoryName: string | null
  photoUrl: string | null
  url: string | null
  brand: string | null
  likedAt: string
  soldAt: string | null
  status: 'AVAILABLE' | 'SOLD' | 'REMOVED'
  timeToSellHours: number | null
}

interface Stats {
  total: number
  available: number
  sold: number
  avgTimeToSellHours: number | null
  winnerThresholdHours: number | null
}

interface SpyCategory {
  id: string
  categoryId: number
  name: string
  active: boolean
}

export default function MarketSpyPage() {
  const [items, setItems] = useState<SpyLikedItem[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [categories, setCategories] = useState<SpyCategory[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'available' | 'sold'>('all')

  const [formCategoryId, setFormCategoryId] = useState('')
  const [formCategoryName, setFormCategoryName] = useState('')

  const [spyBotName, setSpyBotName] = useState('lena')
  const [spyPriceMin, setSpyPriceMin] = useState(40)
  const [spyMaxItems, setSpyMaxItems] = useState(30)
  const [spyLoading, setSpyLoading] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [itemsRes, categoriesRes] = await Promise.all([
        fetch('/api/market-spy'),
        fetch('/api/market-spy/categories')
      ])

      if (itemsRes.ok) {
        const data = await itemsRes.json()
        setItems(data.items || [])
        setStats(data.stats || null)
      }

      if (categoriesRes.ok) {
        const data = await categoriesRes.json()
        setCategories(data.categories || [])
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleAddCategory = async () => {
    if (!formCategoryId || !formCategoryName) return

    try {
      const res = await fetch('/api/market-spy/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: parseInt(formCategoryId),
          name: formCategoryName
        })
      })

      if (res.ok) {
        setFormCategoryId('')
        setFormCategoryName('')
        await fetchData()
      }
    } catch (error) {
      console.error('Failed to add category:', error)
    }
  }

  const handleDeleteCategory = async (categoryId: number) => {
    try {
      const res = await fetch(`/api/market-spy/categories?categoryId=${categoryId}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        await fetchData()
      }
    } catch (error) {
      console.error('Failed to delete category:', error)
    }
  }

  const handleTriggerSpy = async () => {
    if (!spyBotName) return

    setSpyLoading(true)
    try {
      const res = await fetch('/api/market-spy/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botAccountName: spyBotName,
          categories: categories
            .filter(c => c.active)
            .map(c => ({ id: c.categoryId, name: c.name })),
          priceMin: spyPriceMin,
          maxItemsPerCategory: spyMaxItems
        })
      })

      if (res.ok) {
        alert('Action envoyée ! L\'extension va liker dans quelques minutes.')
      } else {
        alert('Erreur lors du lancement du spy')
      }
    } catch (error) {
      console.error('Failed to trigger spy:', error)
      alert('Erreur lors du lancement du spy')
    }
    setSpyLoading(false)
  }

  const filteredItems = items
    .sort((a, b) => {
      if (a.status === 'SOLD' && b.status !== 'SOLD') return -1
      if (a.status !== 'SOLD' && b.status === 'SOLD') return 1
      if (a.status === 'SOLD' && b.status === 'SOLD') {
        const aTime = a.timeToSellHours ?? Infinity
        const bTime = b.timeToSellHours ?? Infinity
        return aTime - bTime
      }
      return new Date(b.likedAt).getTime() - new Date(a.likedAt).getTime()
    })
    .filter(item => {
      if (activeTab === 'available') return item.status === 'AVAILABLE'
      if (activeTab === 'sold') return item.status === 'SOLD'
      return true
    })

  const getScoreBadge = (item: SpyLikedItem) => {
    if (item.status === 'SOLD' && item.timeToSellHours !== null && stats?.winnerThresholdHours && item.timeToSellHours <= stats.winnerThresholdHours) {
      return <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-900/40 text-green-300">⚡ Winner</span>
    }
    if (item.timeToSellHours !== null && item.timeToSellHours <= 48) {
      return <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-900/40 text-blue-300">Rapide</span>
    }
    if (item.timeToSellHours !== null) {
      return <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-zinc-700 text-zinc-300">Normal</span>
    }
    return null
  }

  const getStatusChip = (status: string) => {
    if (status === 'AVAILABLE') {
      return <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-900/40 text-green-300">Dispo</span>
    }
    if (status === 'SOLD') {
      return <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-red-900/40 text-red-300">Vendu</span>
    }
    return <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-zinc-700 text-zinc-300">Retiré</span>
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR')
  }

  const formatTimeToSell = (hours: number | null) => {
    if (hours === null) return '--'
    return `${Math.round(hours)}h`
  }

  return (
    <div className="min-h-screen bg-zinc-900 p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Market Spy 🔍</h1>
        <p className="text-zinc-400 mt-1">Détecte les produits winners avant de les sourcer</p>
      </div>

      {loading ? (
        <div className="text-zinc-400">Chargement...</div>
      ) : stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
            <p className="text-zinc-400 text-sm">Total espionnés</p>
            <p className="text-2xl font-bold text-white mt-2">{stats.total}</p>
          </div>
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
            <p className="text-zinc-400 text-sm">Disponibles</p>
            <p className="text-2xl font-bold text-white mt-2">{stats.available}</p>
          </div>
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
            <p className="text-zinc-400 text-sm">Vendus</p>
            <p className="text-2xl font-bold text-white mt-2">{stats.sold}</p>
          </div>
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
            <p className="text-zinc-400 text-sm">Temps moyen</p>
            <p className="text-2xl font-bold text-white mt-2">{stats.avgTimeToSellHours ? `${Math.round(stats.avgTimeToSellHours)}h` : '--'}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Catégories surveillées</h2>
          <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
            {categories.length === 0 ? (
              <p className="text-zinc-500 text-sm">Aucune catégorie</p>
            ) : (
              categories.map(cat => (
                <div key={cat.id} className="flex items-center justify-between bg-zinc-900 p-3 rounded">
                  <div className="flex items-center gap-3">
                    <span className="bg-violet-600 text-white text-xs font-semibold px-2 py-1 rounded">{cat.categoryId}</span>
                    <span className="text-white text-sm">{cat.name}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteCategory(cat.categoryId)}
                    className="text-zinc-400 hover:text-red-400 transition-colors p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-zinc-700 pt-4 space-y-2">
            <input
              type="number"
              placeholder="Category ID"
              value={formCategoryId}
              onChange={(e) => setFormCategoryId(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-violet-600"
            />
            <input
              type="text"
              placeholder="Nom"
              value={formCategoryName}
              onChange={(e) => setFormCategoryName(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-violet-600"
            />
            <button
              onClick={handleAddCategory}
              disabled={!formCategoryId || !formCategoryName}
              className="w-full bg-violet-600 hover:bg-violet-700 disabled:bg-zinc-700 text-white font-medium py-2 rounded transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> Ajouter
            </button>
          </div>
        </div>

        <div className="lg:col-span-2 bg-zinc-800 border border-zinc-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Lancer une session spy</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-zinc-300 mb-1">Compte bot</label>
              <input
                type="text"
                placeholder="lena"
                value={spyBotName}
                onChange={(e) => setSpyBotName(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-violet-600"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-300 mb-1">Prix minimum (€)</label>
              <input
                type="number"
                value={spyPriceMin}
                onChange={(e) => setSpyPriceMin(Number(e.target.value))}
                className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-violet-600"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-300 mb-1">Articles max / catégorie</label>
              <input
                type="number"
                value={spyMaxItems}
                onChange={(e) => setSpyMaxItems(Number(e.target.value))}
                className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-violet-600"
              />
            </div>
            <button
              onClick={handleTriggerSpy}
              disabled={spyLoading || !spyBotName}
              className="w-full bg-violet-600 hover:bg-violet-700 disabled:bg-zinc-700 text-white font-medium py-2 rounded transition-colors flex items-center justify-center gap-2"
            >
              {spyLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Lancement en cours...
                </>
              ) : (
                <>Lancer le Spy 🚀</>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Articles</h2>
          <button
            onClick={() => fetchData()}
            disabled={loading}
            className="text-zinc-400 hover:text-white transition-colors p-2 rounded hover:bg-zinc-700"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-4 mb-4 border-b border-zinc-700">
          {(['all', 'available', 'sold'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-medium text-sm transition-colors ${
                activeTab === tab
                  ? 'text-violet-400 border-b-2 border-violet-400'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {tab === 'all' ? 'Tous' : tab === 'available' ? 'Disponibles' : 'Vendus'}
            </button>
          ))}
        </div>

        {filteredItems.length === 0 ? (
          <div className="text-center py-12 text-zinc-500">Aucun article</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-700">
                  <th className="text-left py-3 px-4 text-zinc-400 font-medium">Photo</th>
                  <th className="text-left py-3 px-4 text-zinc-400 font-medium">Titre</th>
                  <th className="text-left py-3 px-4 text-zinc-400 font-medium">Catégorie</th>
                  <th className="text-left py-3 px-4 text-zinc-400 font-medium">Prix</th>
                  <th className="text-left py-3 px-4 text-zinc-400 font-medium">Liké le</th>
                  <th className="text-left py-3 px-4 text-zinc-400 font-medium">Vendu le</th>
                  <th className="text-left py-3 px-4 text-zinc-400 font-medium">Temps vente</th>
                  <th className="text-left py-3 px-4 text-zinc-400 font-medium">Score</th>
                  <th className="text-left py-3 px-4 text-zinc-400 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-700">
                {filteredItems.map(item => (
                  <tr key={item.id} className="hover:bg-zinc-700/30 transition-colors">
                    <td className="py-3 px-4">
                      {item.photoUrl ? (
                        <img src={item.photoUrl} alt={item.title} className="w-10 h-10 rounded object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded bg-zinc-700" />
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {item.url ? (
                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:underline truncate block max-w-xs">
                          {item.title}
                        </a>
                      ) : (
                        <span className="text-white truncate block max-w-xs">{item.title}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-zinc-300">{item.categoryName || item.categoryId}</td>
                    <td className="py-3 px-4 text-white font-medium">{item.price.toFixed(2)} €</td>
                    <td className="py-3 px-4 text-zinc-300">{formatDate(item.likedAt)}</td>
                    <td className="py-3 px-4 text-zinc-300">{item.soldAt ? formatDate(item.soldAt) : '—'}</td>
                    <td className="py-3 px-4 text-zinc-300">{formatTimeToSell(item.timeToSellHours)}</td>
                    <td className="py-3 px-4">{getScoreBadge(item)}</td>
                    <td className="py-3 px-4">{getStatusChip(item.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
