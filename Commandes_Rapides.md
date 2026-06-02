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

## 🏦 4. Gérer la Fake Bank (Alimentation & Recyclage)

Le **Fake Bank Builder** te permet d'alimenter ta banque d'annonces réelles en lot sans avoir à écrire les titres et descriptions à la main.

### 📁 Comment préparer tes images dans `Fake_Bank/Input/` :
* **Annonce avec 1 seule photo** : Glisse simplement la photo brute (ex: `table.jpg`) directement à la racine de `vinted_bot/Fake_Bank/Input/`.
* **Annonce avec plusieurs photos (Recommandé)** : Crée un sous-dossier dans `Input/` (ex: `vase_bleu/`) et glisses-y les photos de l'objet sous différents angles. Le script prendra la première photo pour l'analyse IA, et rangera toutes les photos ensemble dans le dossier final de la banque.

### 🚀 Lancer l'alimentation de la Fake Bank :
Déplace-toi d'abord dans le dossier du bot, puis lance le script. Il va lister les rappels de recyclage, traiter toutes les images/dossiers présents dans `Input/`, puis s'arrêter proprement :

```powershell
python fake_bank_builder.py --account nina
```
*(Tu peux remplacer `--account nina` par un autre compte comme `lena` ou `orane` pour adapter automatiquement la langue de génération des annonces en néerlandais, etc.)*

> [!TIP]
> **Mode Watcher Continu** : Si tu préfères que le script tourne en continu et traite les images dès que tu les déposes, ajoute l'option `--watch` :
> ```powershell
> python fake_bank_builder.py --account nina --watch
> ```

### 🔄 Le Cycle de Recyclage (J+3) :
1. **Consommation unique** : Lorsqu'un bot utilise une annonce fake lors de l'alternance, il déplace automatiquement son dossier vers `Fake_Bank/Used/`. Aucun doublon n'est possible entre tes comptes.
2. **Rappels automatiques** : À chaque lancement de `fake_bank_builder.py`, le terminal analyse tes fakes déjà utilisées et t'affiche une liste des objets qui ont été postés il y a **3 jours ou plus**. C'est le moment idéal pour les re-prendre en photo sous un autre angle et les remettre dans `Input/` !

---

## 📝 5. Gérer tes commandes vendues

Une fois que tes annonces sont publiées et qu'un article est vendu, ouvre l'historique de commandes correspondant à ton compte dans Obsidian :
- **Compte Nina** : 👉 [[02 Projects/Business Vinted/Accounts/nina/Sourcing_History|Historique Nina]]
- **Compte Margaux** : 👉 [[02 Projects/Business Vinted/Accounts/margaux/Sourcing_History|Historique Margaux]]
- **Compte Léna** : 👉 [[02 Projects/Business Vinted/Accounts/lena/Sourcing_History|Historique Léna]]
- **Compte Orane** : 👉 [[02 Projects/Business Vinted/Accounts/orane/Sourcing_History|Historique Orane]]

Tu y retrouveras le lien d'achat direct Shein pour commander l'article en 1 clic et cocher la case pour le marquer comme commandé !
