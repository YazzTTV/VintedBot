import prisma from '@/lib/prisma'

/**
 * Ordonnanceur de rotation (le « cerveau »).
 *
 * Phase 1 : calcule le plan quotidien par compte SANS rien exécuter ni muter
 * (dry-run). Il lit l'état (WinnerQueue + VintedItemMetrics synchronisées par
 * l'extension), décide quoi reposter / swapper / retraiter / publier, et journalise
 * les décisions dans RotationEvent pour inspection.
 *
 * Règles (validées avec l'utilisateur) :
 *  - 35 winners max en ligne par compte (slots « collants »).
 *  - Reposts prioritaires : VENDUS > MASQUÉS > INVENDUS > repostAgeDays (7j).
 *  - Une vente ne libère PAS de slot (on repost le vendu : winner prouvé).
 *  - À l'expiration 7j d'un invendu : si un winner frais est en file -> SWAP
 *    (publier le frais, l'ancien repart en fond de file) ; sinon REPOST.
 *  - Retraite après maxUnsoldReposts (N=3) reposts sans vente.
 *  - Slots vides (rampe / post-retraite) remplis depuis la file (FIFO recirculant).
 */

// Statuts normalisés côté VintedItemMetrics (cf. VINTED_MANAGER.md §4)
const STATUS_SOLD = 'Vendu'
const STATUS_MASKED = 'Masqué'

export type Decision =
  | 'REPOST_SOLD'
  | 'REPOST_MASKED'
  | 'REPOST_EXPIRED'
  | 'SWAP_OUT'
  | 'PUBLISH_FRESH'
  | 'RETIRE'
  | 'FILL_SLOT'
  | 'SKIP'

// Ordre d'exécution (plus petit = plus prioritaire) — sert au séquençage Phase 3.
const PRIORITY: Record<Decision, number> = {
  REPOST_SOLD: 1,
  REPOST_MASKED: 2,
  REPOST_EXPIRED: 3,
  SWAP_OUT: 4,
  PUBLISH_FRESH: 5,
  FILL_SLOT: 6,
  RETIRE: 7,
  SKIP: 99,
}

export interface PlanItem {
  kind: 'WINNER' | 'FAKE'
  refId: string
  vintedItemId: string | null
  title: string
  decision: Decision
  reason: string
  priority: number
}

export interface RotationPlan {
  account: string
  botAccountId: string
  dryRun: boolean
  generatedAt: string
  config: {
    enabled: boolean
    targetWinnerSlots: number
    maxUnsoldReposts: number
    repostAgeDays: number
  }
  counts: {
    activeWinners: number
    queuedWinners: number
    freeSlots: number
  }
  items: PlanItem[]
  summary: Record<string, number>
}

const DAY_MS = 24 * 60 * 60 * 1000

function ageInDays(ref: Date | null | undefined, now: Date): number {
  if (!ref) return Infinity // pas de date de référence -> traité comme « vieux »
  return (now.getTime() - ref.getTime()) / DAY_MS
}

/**
 * Calcule le plan de rotation des WINNERS pour un compte.
 * @param accountName  nom du BotAccount (clé "name")
 * @param opts.dryRun  true (défaut) = ne mute pas WinnerQueue, journalise seulement
 * @param opts.persist true (défaut) = écrit les décisions dans RotationEvent
 */
export async function computeRotationPlan(
  accountName: string,
  opts: { dryRun?: boolean; persist?: boolean; now?: Date } = {}
): Promise<RotationPlan> {
  const dryRun = opts.dryRun ?? true
  const persist = opts.persist ?? true
  const now = opts.now ?? new Date()

  const account = await prisma.botAccount.findUnique({
    where: { name: accountName },
    include: { rotationConfig: true },
  })
  if (!account) throw new Error(`Compte bot introuvable : ${accountName}`)

  const cfg = account.rotationConfig
  const config = {
    enabled: cfg?.enabled ?? false,
    targetWinnerSlots: cfg?.targetWinnerSlots ?? 35,
    maxUnsoldReposts: cfg?.maxUnsoldReposts ?? 3,
    repostAgeDays: cfg?.repostAgeDays ?? 7,
  }

  // État actuel de la file winner du compte.
  const active = await prisma.winnerQueue.findMany({
    where: { botAccountId: account.id, status: 'ACTIVE' },
  })
  const queued = await prisma.winnerQueue.findMany({
    where: { botAccountId: account.id, status: 'QUEUED' },
    orderBy: [{ queuePosition: 'asc' }, { createdAt: 'asc' }],
  })

  // Métriques Vinted (statut + âge) des items live, en une requête.
  const liveIds = active.map((a) => a.vintedItemId).filter((x): x is string => !!x)
  const metrics = liveIds.length
    ? await prisma.vintedItemMetrics.findMany({ where: { id: { in: liveIds } } })
    : []
  const metricById = new Map(metrics.map((m) => [m.id, m]))

  const items: PlanItem[] = []
  const push = (it: Omit<PlanItem, 'priority'>) =>
    items.push({ ...it, priority: PRIORITY[it.decision] })

  // File de winners frais disponibles pour swap/remplissage (FIFO recirculant).
  const freshQueue = [...queued]
  const takeFresh = () => freshQueue.shift()

  // On compte les slots qui RESTERONT occupés (retraites/sorties les libèrent).
  let occupied = active.length

  for (const a of active) {
    const m = a.vintedItemId ? metricById.get(a.vintedItemId) : undefined
    const status = m?.status ?? null
    const ageRef = a.lastRepostAt ?? a.publishedAt ?? m?.uploadedAtVinted ?? null
    const age = ageInDays(ageRef, now)

    if (status === STATUS_SOLD) {
      // Winner prouvé -> on relist (priorité 1). Le compteur N sera remis à 0 à l'exécution.
      push({ kind: 'WINNER', refId: a.id, vintedItemId: a.vintedItemId, title: a.title, decision: 'REPOST_SOLD', reason: 'Vendu -> relist (compteur N remis à 0)' })
      continue
    }
    if (status === STATUS_MASKED) {
      push({ kind: 'WINNER', refId: a.id, vintedItemId: a.vintedItemId, title: a.title, decision: 'REPOST_MASKED', reason: 'Masqué par Vinted -> repost prioritaire' })
      continue
    }
    if (age >= config.repostAgeDays) {
      const nextCount = a.unsoldRepostCount + 1
      if (nextCount > config.maxUnsoldReposts) {
        // Retraite : sort du pool, libère le slot.
        push({ kind: 'WINNER', refId: a.id, vintedItemId: a.vintedItemId, title: a.title, decision: 'RETIRE', reason: `Invendu après ${a.unsoldRepostCount} reposts (>= N=${config.maxUnsoldReposts})` })
        occupied -= 1
        continue
      }
      const fresh = takeFresh()
      if (fresh) {
        // SWAP : publie un frais, l'ancien repart en fond de file (pas abandonné).
        push({ kind: 'WINNER', refId: a.id, vintedItemId: a.vintedItemId, title: a.title, decision: 'SWAP_OUT', reason: `Invendu 7j -> retour fond de file, remplacé par "${fresh.title}"` })
        push({ kind: 'WINNER', refId: fresh.id, vintedItemId: null, title: fresh.title, decision: 'PUBLISH_FRESH', reason: `Frais à tester (swap de "${a.title}")` })
        // occupied inchangé (1 sort du live, 1 entre)
      } else {
        // Pas de frais -> on rafraîchit l'ancien (repost N+1).
        push({ kind: 'WINNER', refId: a.id, vintedItemId: a.vintedItemId, title: a.title, decision: 'REPOST_EXPIRED', reason: `Invendu 7j, repost ${nextCount}/${config.maxUnsoldReposts} (aucun frais en file)` })
      }
      continue
    }
    // Encore dans la fenêtre 7j, ni vendu ni masqué -> rien à faire.
    push({ kind: 'WINNER', refId: a.id, vintedItemId: a.vintedItemId, title: a.title, decision: 'SKIP', reason: `En ligne depuis ${age.toFixed(1)}j (< ${config.repostAgeDays}j)` })
  }

  // Remplissage des slots libres (rampe initiale + après retraites) depuis la file.
  let freeSlots = Math.max(0, config.targetWinnerSlots - occupied)
  while (freeSlots > 0) {
    const fresh = takeFresh()
    if (!fresh) break
    push({ kind: 'WINNER', refId: fresh.id, vintedItemId: null, title: fresh.title, decision: 'FILL_SLOT', reason: 'Remplissage slot libre depuis la file' })
    freeSlots -= 1
    occupied += 1
  }

  // Tri par priorité d'exécution.
  items.sort((x, y) => x.priority - y.priority)

  const summary: Record<string, number> = {}
  for (const it of items) summary[it.decision] = (summary[it.decision] ?? 0) + 1

  // Journalisation (RotationEvent) — inspectable à blanc.
  if (persist && items.length) {
    await prisma.rotationEvent.createMany({
      data: items.map((it) => ({
        botAccountId: account.id,
        kind: it.kind,
        refId: it.refId,
        vintedItemId: it.vintedItemId,
        decision: it.decision,
        reason: it.reason,
        dryRun,
      })),
    })
  }

  return {
    account: account.name,
    botAccountId: account.id,
    dryRun,
    generatedAt: now.toISOString(),
    config,
    counts: {
      activeWinners: active.length,
      queuedWinners: queued.length,
      freeSlots: Math.max(0, config.targetWinnerSlots - active.length),
    },
    items,
    summary,
  }
}
