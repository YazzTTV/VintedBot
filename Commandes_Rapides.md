# 🚀 Commandes Rapides — Automatisation Vinted

Ce guide réunit toutes les commandes de terminal pour lancer rapidement tes outils de sourcing (Scraper) et de traitement d'annonces (Watcher).

---

## 📂 1. Avant de lancer (Étape importante)

Avant d'exécuter une commande, ouvre ta console **PowerShell** et déplace-toi dans le dossier du bot en copiant-collant cette ligne :

```powershell
cd "D:\AntiGravity\02 Projects\Business Vinted\vinted_bot"
```

---

## 🦅 2. Lancer le Watcher (Écouteur d'images)

Le **Watcher** doit tourner en arrière-plan. Dès qu'une image de vêtement arrive dans ton dossier d'entrée, il l'analyse, crée l'annonce, génère le selfie, l'image au sol, les upscale et les envoie sur ton téléphone.

Pour le lancer (sur le compte **Nina** par défaut) :
```powershell
python watcher.py
```

Pour le lancer sur le compte **Margaux** :
```powershell
python watcher.py --account margaux
```

Pour le lancer sur le compte **Léna** :
```powershell
python watcher.py --account lena
```

Pour le lancer sur le compte **Orane** :
```powershell
python watcher.py --account orane
```

> [!TIP]
> Laisse cette fenêtre ouverte pendant que tu sources tes articles. Pour l'arrêter, fais simplement **Ctrl + C** dans la console.

---

## 🕷️ 3. Lancer le Scraper (Sourcing d'articles Shein)

Le **Scraper** va chercher automatiquement des vêtements uniques en livraison rapide UE (< 15€) et les prépare pour le Watcher.

### 👗 Option A : Lancer par défaut (Compte Nina, 10 Robes)
```powershell
python scraper.py
```

### 👧 Option B : Lancer pour Margaux
```powershell
python scraper.py --account margaux
```

### 👒 Option C : Lancer pour Léna
```powershell
python scraper.py --account lena
```

### 👩‍🦰 Option D : Lancer pour Orane
```powershell
python scraper.py --account orane
```

### 🔢 Option C : Choisir le nombre d'articles (ex: 100)
```powershell
python scraper.py --count 100 --account nina
```

### 🧪 Option D : Cibler une catégorie spécifique
Le scraper cible les robes par défaut, mais tu peux lui passer n'importe quelle URL filtrée de Shein (ex: pour cibler les **Jupes**) :
```powershell
python scraper.py --account nina --count 10 --url "https://fr.shein.com/Women-Skirts-c-1732.html?tag_ids=quickship&price_max=15"
```

---

## 📝 4. Gérer tes commandes vendues

Une fois que tes annonces sont publiées et qu'un article est vendu, ouvre l'historique de commandes correspondant à ton compte dans Obsidian :
- **Compte Nina** : 👉 [[02 Projects/Business Vinted/Accounts/nina/Sourcing_History|Historique Nina]]
- **Compte Margaux** : 👉 [[02 Projects/Business Vinted/Accounts/margaux/Sourcing_History|Historique Margaux]]
- **Compte Léna** : 👉 [[02 Projects/Business Vinted/Accounts/lena/Sourcing_History|Historique Léna]]
- **Compte Orane** : 👉 [[02 Projects/Business Vinted/Accounts/orane/Sourcing_History|Historique Orane]]

Tu y retrouveras le lien d'achat direct Shein pour commander l'article en 1 clic et cocher la case pour le marquer comme commandé !
