# Cahier des charges — Vinted Manager
### Outil de gestion automatisée des commandes et du stock

| | |
|---|---|
| **Version** | 1.0 |
| **Date** | Mai 2026 |
| **Statut** | En cours de validation |
| **Plateforme cible** | Web (desktop + mobile) |

> **Contexte** : Activité de revente d'articles de mode sur Vinted (dropshipping Temu / Shein). L'outil doit centraliser et automatiser la gestion des commandes fournisseurs, du stock, des ventes et des expéditions pour piloter l'activité depuis une seule interface.

---

## Table des matières

1. [Contexte et objectifs](#1-contexte-et-objectifs)
2. [Fonctionnalités détaillées](#2-fonctionnalités-détaillées)
3. [Architecture technique](#3-architecture-technique)
4. [Schéma de la base de données](#4-schéma-de-la-base-de-données)
5. [API REST](#5-api-rest)
6. [Automatisations](#6-automatisations)
7. [Plan de développement](#7-plan-de-développement)
8. [Sécurité et conformité](#8-sécurité-et-conformité)
9. [Stratégie de tests](#9-stratégie-de-tests)
10. [Budget et hébergement](#10-budget-et-hébergement)
11. [Prochaines étapes](#11-prochaines-étapes)

---

## 1. Contexte et objectifs

### 1.1 Description de l'activité

L'activité consiste à acheter des articles de mode (robes, vêtements) sur des plateformes fournisseurs (Temu, Shein) et à les revendre sur Vinted avec une marge bénéficiaire. Chaque colis fournisseur peut contenir plusieurs articles revendus séparément.

**Flux actuel :**

1. Commande fournisseur sur Temu ou Shein
2. Réception du colis avec N articles
3. Mise en vente de chaque article sur Vinted
4. Vente à un acheteur Vinted
5. Expédition avec bordereau Vinted
6. Suivi du bénéfice et de la marge

**Problèmes identifiés :**

- Suivi manuel sur Google Sheets, source d'erreurs
- Aucune alerte automatique sur les dates limites d'expédition
- Pas de vision globale du stock réel
- Calcul de marges fait à la main
- Pas de traçabilité des relances acheteurs

### 1.2 Objectifs du projet

Construire une application web full-stack qui remplace le tableur Google Sheets par un outil professionnel, automatisé et évolutif.

| Objectif | Description |
|---|---|
| **Centralisation** | Une seule interface pour tout gérer : achats, stock, ventes, expéditions |
| **Automatisation** | Calcul auto des marges, alertes, statuts, synchronisation Vinted |
| **Pilotage** | Dashboard avec KPIs en temps réel : CA, bénéfice, marge, stock |
| **Traçabilité** | Historique complet de chaque article du colis à la livraison |
| **Mobile-first** | Interface utilisable sur téléphone pour gérer depuis n'importe où |

### 1.3 Périmètre

**Dans le périmètre (V1) :**

- Gestion des commandes fournisseurs (Temu, Shein)
- Gestion du stock article par article
- Gestion des ventes Vinted et des acheteurs
- Suivi des expéditions et bordereaux
- Dashboard financier (CA, bénéfice, marge)
- Alertes dates limites d'expédition
- Authentification utilisateur

**Hors périmètre V1 (prévu V2) :**

- Intégration API Vinted (scraping ou API non officielle)
- Comptabilité avancée et TVA
- Application mobile native
- Gestion multi-comptes Vinted

---

## 2. Fonctionnalités détaillées

### 2.1 Module Commandes fournisseurs

Gestion des achats effectués sur Temu et Shein.

| Fonctionnalité | Détail |
|---|---|
| Saisie commande | N° commande, date, fournisseur, prix total, lien produit, nombre d'articles |
| Split automatique | Si N articles dans un colis, création de N lignes stock avec prix unitaire calculé |
| Statut commande | Commandée → En transit → Reçue → En stock |
| Historique | Toutes les commandes classées par date avec total investi |
| Lien produit | URL cliquable vers la fiche Temu ou Shein |

### 2.2 Module Stock

Vision claire de tous les articles disponibles à la vente.

| Fonctionnalité | Détail |
|---|---|
| Liste du stock | Tous les articles avec : N° commande, prix d'achat unitaire, frais de port unitaire, date réception |
| Filtres | Par fournisseur, par fourchette de prix, par date |
| Statuts article | En stock / Vendu / Expédié / Relance |
| Coût réel | Prix achat + part des frais de port calculé automatiquement |
| Actions rapides | Bouton "Mettre en vente" depuis la liste stock |

### 2.3 Module Ventes Vinted

Gestion de chaque vente réalisée sur Vinted.

| Fonctionnalité | Détail |
|---|---|
| Enregistrement vente | Pseudo acheteur, prix de vente, date limite expédition, lien vente Vinted |
| Calcul automatique | Bénéfice = Prix vente − Prix achat − Frais port − Frais Vinted (0,70 €) |
| Marge en % | Calculée et affichée automatiquement |
| Relances | Marquer un acheteur à relancer avec note |
| Historique ventes | Toutes les ventes avec recherche par pseudo ou N° commande |

### 2.4 Module Expéditions

Suivi des envois et des bordereaux Vinted.

| Fonctionnalité | Détail |
|---|---|
| À expédier | Liste de tous les articles vendus pas encore expédiés |
| Alerte urgence | Mise en évidence des envois à faire dans moins de 48h |
| Saisie bordereau | Numéro de bordereau Vinted enregistré à la confirmation d'expédition |
| Historique envois | Tous les colis expédiés avec date et bordereau |
| Export | Export CSV de la liste à expédier |

### 2.5 Dashboard et reporting

| KPI / Widget | Détail |
|---|---|
| KPIs principaux | CA total, Bénéfice net, Marge moyenne, Nb ventes, Nb articles en stock |
| Graphiques | Évolution du CA sur 30j, Répartition des marges, Top produits |
| Alertes dashboard | Expéditions urgentes, articles en stock depuis plus de 30j |
| Filtre période | Aujourd'hui / 7j / 30j / Mois en cours / Tout |

---

## 3. Architecture technique

### 3.1 Stack recommandée

> Choix orientés productivité maximale pour un développeur solo, avec un coût d'hébergement nul au démarrage.

#### Frontend

| Élément | Technologie | Justification |
|---|---|---|
| Framework | **Next.js 14** (App Router) | React + SSR + routing intégré |
| UI Components | **shadcn/ui** + Tailwind CSS | Composants accessibles, personnalisables, zéro config |
| Graphiques | **Recharts** | Librairie React légère, responsive |
| Formulaires | **React Hook Form** + Zod | Validation de schémas côté client |
| State management | **Zustand** | Store léger, pas de boilerplate Redux |
| Icônes | **Lucide React** | Set d'icônes modernes, cohérent |

#### Backend

| Élément | Technologie | Justification |
|---|---|---|
| Runtime | **Node.js** via Next.js API Routes | Tout dans un seul projet, simplifie le deploy |
| ORM | **Prisma** | Type-safe, migrations automatiques, DX excellente |
| Base de données | **PostgreSQL** (via Supabase) | Gratuit jusqu'à 500MB, interface admin incluse |
| Authentification | **NextAuth.js** | Auth complète en quelques lignes, session sécurisée |
| Validation API | **Zod** | Schémas partagés front/back |
| Jobs planifiés | **Vercel Cron** | Pour les alertes automatiques et syncs |

#### Infrastructure et DevOps

| Élément | Technologie | Justification |
|---|---|---|
| Hébergement | **Vercel** | Gratuit, deploy automatique depuis GitHub |
| Base de données | **Supabase** | PostgreSQL managé, gratuit, API REST incluse |
| Stockage fichiers | **Supabase Storage** | Pour exports ou photos produits |
| CI/CD | **GitHub Actions** | Tests et deploy automatiques à chaque push |
| Monitoring | **Vercel Analytics** + Sentry | Erreurs et perfs en temps réel |

### 3.2 Structure des dossiers

```
vinted-manager/
├── app/                        # Next.js App Router
│   ├── (auth)/                 # Pages auth (login, register)
│   ├── dashboard/              # Page dashboard
│   ├── commandes/              # Gestion commandes fournisseurs
│   ├── stock/                  # Gestion du stock
│   ├── ventes/                 # Ventes Vinted
│   ├── expeditions/            # Module expéditions
│   └── api/                    # API Routes (backend)
│       ├── auth/               # NextAuth endpoints
│       ├── commandes/          # CRUD commandes
│       ├── articles/           # CRUD articles stock
│       ├── ventes/             # CRUD ventes
│       └── stats/              # Endpoints dashboard
├── components/                 # Composants UI réutilisables
│   ├── ui/                     # shadcn/ui components
│   ├── dashboard/              # Composants dashboard
│   └── forms/                  # Formulaires métier
├── lib/
│   ├── prisma.ts               # Client Prisma singleton
│   ├── auth.ts                 # Config NextAuth
│   └── utils.ts                # Fonctions utilitaires (calcul marges...)
├── prisma/
│   ├── schema.prisma           # Schéma base de données
│   └── migrations/             # Historique migrations
└── types/                      # Types TypeScript partagés
```

### 3.3 Architecture des données (flux)

```
CommandeFournisseur (1)
    └── Article[] (N)           # Split auto à la saisie
            └── Vente (0..1)    # Quand l'article est vendu
                    └── Expédition (0..1)  # Quand c'est envoyé
```

---

## 4. Schéma de la base de données

### Table `User`

| Champ | Type | Description |
|---|---|---|
| `id` | String (UUID) | Clé primaire |
| `email` | String (unique) | Email de connexion |
| `password` | String (hash) | Mot de passe hashé (bcrypt) |
| `name` | String | Nom affiché |
| `createdAt` | DateTime | Date création compte |

### Table `CommandeFournisseur`

| Champ | Type | Description |
|---|---|---|
| `id` | String (UUID) | Clé primaire |
| `userId` | String (FK) | Propriétaire |
| `numero` | String | N° commande Temu/Shein |
| `fournisseur` | Enum | `TEMU` / `SHEIN` / `AUTRE` |
| `dateCommande` | DateTime | Date de passation |
| `prixTotal` | Decimal | Montant total facturé |
| `fraisPort` | Decimal | Frais de livraison totaux |
| `nbArticles` | Int | Nombre d'articles dans le colis |
| `lienProduit` | String? | URL fiche produit fournisseur |
| `statut` | Enum | `COMMANDEE` / `EN_TRANSIT` / `RECUE` |
| `notes` | String? | Notes libres |
| `createdAt` | DateTime | Date de création en BDD |

### Table `Article` (stock)

| Champ | Type | Description |
|---|---|---|
| `id` | String (UUID) | Clé primaire |
| `commandeId` | String (FK) | Commande fournisseur parente |
| `prixAchatUnitaire` | Decimal | Prix achat ÷ nb articles |
| `fraisPortUnitaires` | Decimal | Frais port ÷ nb articles |
| `lienProduit` | String? | URL spécifique à cet article |
| `statut` | Enum | `STOCK` / `VENDU` / `EXPEDIE` / `RELANCE` |
| `dateAjoutStock` | DateTime | Date d'entrée en stock |
| `notes` | String? | Notes sur l'article |

### Table `Vente`

| Champ | Type | Description |
|---|---|---|
| `id` | String (UUID) | Clé primaire |
| `articleId` | String (FK unique) | Article vendu |
| `pseudoAcheteur` | String | Pseudo Vinted de l'acheteur |
| `prixVente` | Decimal | Prix de vente Vinted |
| `fraisVinted` | Decimal (défaut 0.70) | Commission Vinted |
| `beneficeNet` | Decimal (calculé) | Prix vente − achats − frais |
| `margePct` | Decimal (calculé) | Bénéfice ÷ Prix vente × 100 |
| `dateVente` | DateTime | Date de la vente |
| `dateLimiteExpedition` | DateTime? | Date max d'envoi Vinted |
| `lienVente` | String? | URL de la transaction Vinted |
| `statut` | Enum | `EN_ATTENTE` / `EXPEDIEE` / `ANNULEE` |

### Table `Expedition`

| Champ | Type | Description |
|---|---|---|
| `id` | String (UUID) | Clé primaire |
| `venteId` | String (FK unique) | Vente associée |
| `numeroBordereau` | String? | N° bordereau Vinted |
| `dateExpedition` | DateTime | Date d'envoi effectif |
| `transporteur` | String? | Colissimo, Mondial Relay… |
| `notes` | String? | Notes expédition |

### Schéma Prisma complet

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Fournisseur {
  TEMU
  SHEIN
  AUTRE
}

enum StatutCommande {
  COMMANDEE
  EN_TRANSIT
  RECUE
}

enum StatutArticle {
  STOCK
  VENDU
  EXPEDIE
  RELANCE
}

enum StatutVente {
  EN_ATTENTE
  EXPEDIEE
  ANNULEE
}

model User {
  id         String               @id @default(uuid())
  email      String               @unique
  password   String
  name       String?
  createdAt  DateTime             @default(now())
  commandes  CommandeFournisseur[]
}

model CommandeFournisseur {
  id           String         @id @default(uuid())
  userId       String
  user         User           @relation(fields: [userId], references: [id])
  numero       String
  fournisseur  Fournisseur
  dateCommande DateTime
  prixTotal    Decimal        @db.Decimal(10, 2)
  fraisPort    Decimal        @db.Decimal(10, 2)
  nbArticles   Int            @default(1)
  lienProduit  String?
  statut       StatutCommande @default(COMMANDEE)
  notes        String?
  createdAt    DateTime       @default(now())
  articles     Article[]
}

model Article {
  id                  String              @id @default(uuid())
  commandeId          String
  commande            CommandeFournisseur @relation(fields: [commandeId], references: [id])
  prixAchatUnitaire   Decimal             @db.Decimal(10, 2)
  fraisPortUnitaires  Decimal             @db.Decimal(10, 2)
  lienProduit         String?
  statut              StatutArticle       @default(STOCK)
  dateAjoutStock      DateTime            @default(now())
  notes               String?
  vente               Vente?
}

model Vente {
  id                    String      @id @default(uuid())
  articleId             String      @unique
  article               Article     @relation(fields: [articleId], references: [id])
  pseudoAcheteur        String
  prixVente             Decimal     @db.Decimal(10, 2)
  fraisVinted           Decimal     @db.Decimal(10, 2) @default(0.70)
  beneficeNet           Decimal     @db.Decimal(10, 2)
  margePct              Decimal     @db.Decimal(5, 2)
  dateVente             DateTime    @default(now())
  dateLimiteExpedition  DateTime?
  lienVente             String?
  statut                StatutVente @default(EN_ATTENTE)
  expedition            Expedition?
}

model Expedition {
  id               String   @id @default(uuid())
  venteId          String   @unique
  vente            Vente    @relation(fields: [venteId], references: [id])
  numeroBordereau  String?
  dateExpedition   DateTime @default(now())
  transporteur     String?
  notes            String?
}
```

---

## 5. API REST

### 5.1 Endpoints

| Endpoint | Méthode | Description |
|---|---|---|
| `/api/commandes` | GET | Liste toutes les commandes (paginé) |
| `/api/commandes` | POST | Crée une commande + split auto en N articles |
| `/api/commandes/:id` | PATCH | Mise à jour (statut, notes…) |
| `/api/commandes/:id` | DELETE | Supprime si aucune vente associée |
| `/api/articles` | GET | Liste le stock (filtres : statut, fournisseur, date) |
| `/api/articles/:id` | PATCH | Mise à jour d'un article |
| `/api/ventes` | GET | Liste toutes les ventes (paginé, filtrable) |
| `/api/ventes` | POST | Crée une vente pour un article stock |
| `/api/ventes/:id` | PATCH | Mise à jour (prix, acheteur, statut) |
| `/api/expeditions` | POST | Enregistre une expédition |
| `/api/stats/dashboard` | GET | Tous les KPIs pour le dashboard |
| `/api/stats/evolution` | GET | Séries temporelles pour les graphiques |
| `/api/export/csv` | GET | Export CSV de la liste à expédier |

### 5.2 Format de réponse standard

```json
{
  "success": true,
  "data": { "..." : "..." },
  "meta": {
    "total": 42,
    "page": 1,
    "perPage": 20
  }
}
```

### 5.3 Exemple — POST /api/commandes

```typescript
// Payload
{
  "numero": "GSO1YS50U003EC2",
  "fournisseur": "SHEIN",
  "dateCommande": "2026-05-11",
  "prixTotal": 8.05,
  "fraisPort": 1.50,
  "nbArticles": 2,
  "lienProduit": "https://fr.shein.com/..."
}

// Résultat : création de la commande + 2 articles en stock
// avec prixAchatUnitaire = 8.05 / 2 = 4.025
// et fraisPortUnitaires = 1.50 / 2 = 0.75
```

### 5.4 Exemple — Calcul du bénéfice

```typescript
// lib/utils.ts
export function calculerBenefice(params: {
  prixVente: number;
  prixAchat: number;
  fraisPort: number;
  fraisVinted?: number;
}): { beneficeNet: number; margePct: number } {
  const fraisVinted = params.fraisVinted ?? 0.70;
  const beneficeNet = params.prixVente - params.prixAchat - params.fraisPort - fraisVinted;
  const margePct = (beneficeNet / params.prixVente) * 100;
  return {
    beneficeNet: Math.round(beneficeNet * 100) / 100,
    margePct: Math.round(margePct * 100) / 100,
  };
}
```

---

## 6. Automatisations

### 6.1 Automatisations V1

> Ces automatisations constituent la valeur ajoutée principale de l'outil par rapport au tableur. Toutes doivent être livrées en V1.

| Automatisation | Description | Mécanisme |
|---|---|---|
| **Calcul bénéfice/marge** | Automatique à chaque création ou modification de vente | Trigger API (Prisma middleware) |
| **Split colis** | Création auto de N articles à la saisie d'une commande N articles | API POST /commandes |
| **Alerte expédition J+2** | Badge dashboard + email si date limite dans moins de 48h | Cron toutes les 2h |
| **Alerte stock dormant** | Badge si un article est en stock depuis plus de 30 jours | Cron quotidien |
| **Mise à jour statuts** | Article passe automatiquement en `VENDU` quand une vente est créée | Trigger API |
| **Stats dashboard** | KPIs recalculés en temps réel à chaque action | SWR revalidation |

### 6.2 Automatisations V2 (futures)

| Automatisation | Description | Mécanisme |
|---|---|---|
| **Sync Vinted** | Détection automatique de nouvelles ventes via scraper | Cron + Playwright |
| **Import CSV fournisseur** | Import du récapitulatif de commande Temu/Shein en un clic | Parser CSV (papaparse) |
| **Rapport hebdo email** | Email récap chaque lundi : CA semaine, nb ventes, alertes stock | Resend + cron |
| **Suggestion prix** | Estimation du prix de vente optimal basé sur l'historique | Algo statistique |
| **Détection doublon** | Alerte si un même article est déjà en cours de vente | Scraping Vinted |
| **Export comptabilité** | Export mensuel au format comptable (CSV normé) | Export personnalisé |

### 6.3 Système de notifications

| Canal | Usage | Outil |
|---|---|---|
| **Email** | Alertes critiques expédition, rapport hebdo | Resend.com (gratuit jusqu'à 3 000 emails/mois) |
| **In-app** | Badges, bannières, toasts sur le dashboard | Composants React + polling SWR |
| **PWA push** | Notifications push sur téléphone (V2) | Web Push API |

### 6.4 Configuration des crons (Vercel)

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/alertes-expedition",
      "schedule": "0 */2 * * *"
    },
    {
      "path": "/api/cron/stock-dormant",
      "schedule": "0 8 * * *"
    },
    {
      "path": "/api/cron/rapport-hebdo",
      "schedule": "0 9 * * 1"
    }
  ]
}
```

---

## 7. Plan de développement

### 7.1 Découpage en sprints

| Sprint | Durée | Thème | Contenu |
|---|---|---|---|
| **Sprint 0** | 3 jours | Setup projet | Init Next.js, config Prisma + Supabase, auth NextAuth, deploy Vercel, CI/CD GitHub Actions |
| **Sprint 1** | 5 jours | Commandes & Stock | CRUD commandes fournisseurs, split auto articles, liste stock, filtres et statuts |
| **Sprint 2** | 5 jours | Ventes & Expéditions | Enregistrement ventes, calcul auto marges, module expéditions, alertes urgence |
| **Sprint 3** | 4 jours | Dashboard | KPIs temps réel, graphiques évolution CA, alertes stock dormant, export CSV |
| **Sprint 4** | 3 jours | Polish & Mobile | Responsive mobile, UX/UI final, tests E2E, optimisations perfs |
| **Sprint 5** | 3 jours | Automatisations | Crons alertes email, notifications in-app, import CSV fournisseur |

**Durée totale estimée : 23 jours**

### 7.2 Ordre de priorité (MoSCoW)

| Priorité | Fonctionnalités |
|---|---|
| 🔴 **Must have** | Saisie commandes, stock, ventes, expéditions, calcul marges, alertes J+2 |
| 🟠 **Should have** | Dashboard KPIs, graphiques, export CSV, import CSV, notifications email |
| 🟡 **Could have** | PWA push, rapport hebdo, suggestion prix, sync Vinted V2 |
| ⚪ **Won't have V1** | Application native iOS/Android, comptabilité avancée, multi-comptes |

### 7.3 Definition of Done

- Toutes les fonctionnalités du sprint sont implémentées et testées
- API endpoints documentés et couverts par des tests unitaires (Jest)
- Interface validée sur desktop et mobile
- Deploy automatique sur Vercel passé sans erreur
- Aucune régression sur les sprints précédents

---

## 8. Sécurité et conformité

### 8.1 Authentification

- NextAuth.js avec session JWT
- Hashage des mots de passe avec bcrypt (rounds: 12)
- Protection CSRF intégrée NextAuth
- Session expiry : 7 jours (configurable)
- Routes API toutes protégées par middleware auth

```typescript
// middleware.ts — protection de toutes les routes
export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/((?!api/auth|login|register|_next).*)"],
};
```

### 8.2 Sécurité des données

- Toutes les requêtes BDD filtrées par `userId` (Row Level Security Supabase)
- Variables d'environnement : `.env.local` (jamais commité)
- HTTPS obligatoire (Vercel le force par défaut)
- Validation des entrées avec Zod côté API
- Rate limiting sur les endpoints sensibles

### 8.3 Backup et disponibilité

- Supabase : backup automatique quotidien inclus dans le plan gratuit
- Vercel : deploy immutable, rollback en 1 clic
- Export manuel JSON/CSV possible à tout moment depuis l'app

### 8.4 Variables d'environnement

```bash
# .env.local
DATABASE_URL="postgresql://..."           # Supabase connection string
NEXTAUTH_SECRET="..."                     # Secret JWT (openssl rand -base64 32)
NEXTAUTH_URL="https://votre-domaine.com"
RESEND_API_KEY="re_..."                   # Pour les emails
```

---

## 9. Stratégie de tests

| Type | Périmètre | Outil | Phase |
|---|---|---|---|
| **Tests unitaires** | Logique métier : calcul bénéfice, marge, split colis | Jest + ts-jest | Sprint 1–3 |
| **Tests API** | Tous les endpoints CRUD | Jest + Supertest | Sprint 1–3 |
| **Tests intégration** | Flux complets : commande → stock → vente → expédition | Playwright | Sprint 4 |
| **Tests UI** | Formulaires, validation, affichage des données | React Testing Library | Sprint 2–4 |
| **Tests perfs** | Temps de réponse API < 300ms, LCP < 2s | Vercel Analytics | Sprint 4 |

### Exemple de test unitaire

```typescript
// __tests__/utils.test.ts
import { calculerBenefice } from "@/lib/utils";

describe("calculerBenefice", () => {
  it("calcule correctement le bénéfice et la marge", () => {
    const result = calculerBenefice({
      prixVente: 30,
      prixAchat: 8.635,
      fraisPort: 1.5,
      fraisVinted: 0.70,
    });
    expect(result.beneficeNet).toBe(19.17);
    expect(result.margePct).toBe(63.88);
  });

  it("retourne un bénéfice négatif si vendu à perte", () => {
    const result = calculerBenefice({
      prixVente: 5,
      prixAchat: 8,
      fraisPort: 1.5,
    });
    expect(result.beneficeNet).toBeLessThan(0);
  });
});
```

---

## 10. Budget et hébergement

### 10.1 Coût mensuel estimatif

| Service | Coût | Détail |
|---|---|---|
| **Vercel** (Hobby) | Gratuit | Frontend + API, 100GB bandwidth/mois, crons limités |
| **Supabase** (Free) | Gratuit | 500MB BDD, 1GB storage, 50k lignes, backup quotidien |
| **Resend.com** (Free) | Gratuit | 3 000 emails/mois, suffisant pour les alertes |
| **GitHub** (Free) | Gratuit | Code source + CI/CD GitHub Actions |
| **Nom de domaine** | ~10 €/an | Optionnel (Vercel fournit un `.vercel.app` gratuit) |
| **TOTAL MENSUEL** | **0 €** | Coût nul jusqu'à forte croissance de l'activité |

> **Si l'activité croît :** Vercel Pro (20 $/mois) + Supabase Pro (25 $/mois) = **45 $/mois** pour une activité professionnelle à plein régime.

---

## 11. Prochaines étapes

### 11.1 Actions immédiates

1. Valider ce cahier des charges
2. Créer le repository GitHub : `vinted-manager`
3. Initialiser le projet Next.js
4. Créer le projet Supabase et récupérer les variables d'environnement
5. Configurer Prisma avec le schéma BDD de la section 4
6. Déployer le squelette vide sur Vercel (intégration GitHub automatique)
7. Démarrer le Sprint 0

### 11.2 Commandes de démarrage

```bash
# 1. Créer le projet
npx create-next-app@latest vinted-manager \
  --typescript \
  --tailwind \
  --app \
  --src-dir

# 2. Installer les dépendances
cd vinted-manager
npm install prisma @prisma/client next-auth zustand recharts
npm install react-hook-form zod @hookform/resolvers
npm install resend
npm install -D @types/node ts-jest jest @testing-library/react

# 3. Initialiser shadcn/ui
npx shadcn@latest init

# 4. Initialiser Prisma
npx prisma init

# 5. Après config .env avec DATABASE_URL Supabase
npx prisma db push
npx prisma generate

# 6. Lancer en local
npm run dev
```

### 11.3 Checklist Sprint 0

- [ ] Repo GitHub créé, branch `main` protégée
- [ ] Next.js 14 initialisé avec TypeScript + Tailwind
- [ ] shadcn/ui configuré
- [ ] Prisma + schéma BDD configuré
- [ ] Connexion Supabase opérationnelle
- [ ] NextAuth configuré (login email/password)
- [ ] Deploy automatique Vercel depuis GitHub
- [ ] GitHub Actions CI (lint + tests) sur chaque PR
- [ ] Variables d'environnement configurées sur Vercel
- [ ] URL de production accessible

---

> Ce document est un cahier des charges vivant. Il peut être mis à jour au fil des sprints. Toute évolution du périmètre doit être documentée ici.

*Dernière mise à jour : Mai 2026 — v1.0*
