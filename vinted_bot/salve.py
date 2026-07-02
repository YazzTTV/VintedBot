"""
salve.py — Orchestrateur d'une salve de publication (routine 5+5).

Pour chaque compte :
  1. Pioche N_WINNERS winners frais (pas encore utilisés par CE compte) + N_FAKES
     fakes globalement non assignés.
  2. WINNERS  -> génération IA (analyse Gemini + 3 images mannequin/selfie/cintre)
     dans la langue du compte (réutilise le pipeline de generer_tous).
  3. FAKES    -> titre/desc générés dans la langue du compte (génération paresseuse),
     les 3 vraies photos sont copiées telles quelles.
  4. Publie en INTERCALÉ (winner, fake, winner, fake, ...) via vinted_publisher,
     avec pauses anti-bot, puis met à jour l'état (anti-doublon).

État local : routine_state.json (migrable vers le manager).

Usage :
  python salve.py --dry-run                 # plan only (pioche + intercalage), AUCUNE génération/publication
  python salve.py --generate-only           # génère le contenu, ne publie pas
  python salve.py                            # génère + publie en BROUILLON (5 comptes)
  python salve.py --submit                   # génère + publie en RÉEL
  python salve.py --accounts orane           # un seul compte
  python salve.py --winners 3 --fakes 2      # personnaliser la salve
  python salve.py --submit --lock            # pose le verrou manager pendant la publication (si déployé)
"""
import os
import re
import sys
import time
import shutil
import random
import asyncio
import argparse
import json
import urllib.request

# Console Windows : forcer UTF-8 (les noms de fichiers winner contiennent des accents combinés).
try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

from dotenv import load_dotenv
load_dotenv()

import routine_pools
import routine_state
from config_manager import get_account_config

BOT = os.path.dirname(os.path.abspath(__file__))
SALVE_OUT = os.path.join(BOT, "_salve_out")
PORT = 9220
ALL_ACCOUNTS = ["emma", "Yazz", "nina", "lena", "orane"]
# Comptes ciblés par l'AUTOMATISATION (cron / salve par défaut).
# yazz + emma sont SORTIS pour l'instant : elles ont déjà la plupart des winners.
# (On peut toujours les viser manuellement : salve.py --accounts emma ...)
AUTOMATION_ACCOUNTS = ["nina", "lena", "orane"]
USERNAME = {
    "emma": "emma_clt3", "Yazz": "yazz_tw", "nina": "nina_mamey",
    "lena": "lenabalvade", "orane": "orane_dlt",
}
MANAGER_URL = os.environ.get("MANAGER_URL", "https://vinted-manager-flame.vercel.app")


# ---------- Verrou manager (best-effort, seulement si --lock) ----------

def manager_lock(account: str, ttl: int = 900) -> bool:
    try:
        data = json.dumps({"account": account, "holder": "PYTHON_SALVE", "reason": "PUBLISH", "ttlSeconds": ttl}).encode()
        req = urllib.request.Request(f"{MANAGER_URL}/api/rotation/lock", data=data,
                                     headers={"Content-Type": "application/json"}, method="POST")
        with urllib.request.urlopen(req, timeout=8) as r:
            return r.status == 200
    except Exception as e:
        print(f"  [LOCK] non posé ({e}) — on continue sans verrou.")
        return False


def manager_unlock(account: str) -> None:
    try:
        data = json.dumps({"account": account}).encode()
        req = urllib.request.Request(f"{MANAGER_URL}/api/rotation/lock", data=data,
                                     headers={"Content-Type": "application/json"}, method="DELETE")
        urllib.request.urlopen(req, timeout=8).read()
    except Exception:
        pass


# ---------- Préparation du contenu ----------

def _copy_photo_capped(src: str, dst: str, max_side: int = 1600, quality: int = 88,
                       threshold: int = 1_500_000) -> None:
    """Copie une photo de fake en la redimensionnant si elle est trop lourde.

    Les photos brutes de smartphone (4+ Mo / 12 MP) tuent le driver Playwright à
    l'upload CDP ('set_input_files: Connection closed while reading from the driver').
    On plafonne le grand côté à max_side et on réencode en JPEG ; Vinted recompresse
    de toute façon. Sous le seuil, copie à l'identique. Fallback copie brute si erreur.
    """
    try:
        if os.path.getsize(src) <= threshold:
            shutil.copy2(src, dst)
            return
        from PIL import Image, ImageOps
        im = ImageOps.exif_transpose(Image.open(src)).convert("RGB")
        im.thumbnail((max_side, max_side), Image.LANCZOS)
        root, _ = os.path.splitext(dst)
        im.save(root + ".jpg", "JPEG", quality=quality, optimize=True)
    except Exception as e:
        print(f"    [WARN] redimensionnement échoué ({os.path.basename(src)}: {e}) -> copie brute")
        shutil.copy2(src, dst)


async def prepare_winner(account: str, cfg, winner: dict, out_dir: str) -> bool:
    """Génère titre/desc + 3 images IA pour un winner (réutilise le pipeline existant)."""
    from processor import analyze_screenshot, suggest_price
    from nano_banana import generate_all_images_parallel_async

    os.makedirs(out_dir, exist_ok=True)
    data = analyze_screenshot(winner["path"], cfg.size, cfg.language, cfg.niche)
    if not data or not data.get("titre_vinted"):
        print(f"    [ERREUR] analyse winner échouée : {winner['sourceKey']}")
        return False

    with open(os.path.join(out_dir, "titre.txt"), "w", encoding="utf-8") as f:
        f.write(data.get("titre_vinted", ""))
    with open(os.path.join(out_dir, "description.txt"), "w", encoding="utf-8") as f:
        f.write(data.get("description_vinted", ""))
    # Prix : override manuel (winner_prices.json) prioritaire, sinon Gemini.
    #  - nombre  -> prix fixe imposé
    #  - [min,max] -> fourchette custom (Gemini choisit dedans, modulé par les ventes)
    #  - None    -> fourchette par défaut (40-80€). sold_count=0 tant que la couche ventes n'existe pas.
    from winner_prices import get_override
    titre, desc = data.get("titre_vinted", ""), data.get("description_vinted", "")
    ov = get_override(winner["sourceKey"])
    if isinstance(ov, int):
        price = ov
        print(f"    [PRIX] override fixe winner '{titre[:40]}' : {price}€")
    elif isinstance(ov, list):
        price = suggest_price("WINNER", titre, desc, cfg.language,
                              sold_count=winner.get("sold_count", 0), price_range=tuple(ov),
                              purchase_price=winner.get("purchase_price"))
    else:
        price = suggest_price("WINNER", titre, desc, cfg.language,
                              sold_count=winner.get("sold_count", 0),
                              purchase_price=winner.get("purchase_price"))
    with open(os.path.join(out_dir, "price.txt"), "w", encoding="utf-8") as f:
        f.write(str(price))

    res = await generate_all_images_parallel_async(
        niche=cfg.niche,
        file_path=winner["path"],
        avatar_path=cfg.avatar_path,
        floor_template_path=cfg.floor_template_path,
        hanger_template_path=cfg.hanger_template_path if os.path.exists(cfg.hanger_template_path) else None,
        product_dir=out_dir,
        prompt=data.get("prompt_image_anglais", ""),
        niche_def=cfg.niche_def,
    )
    n = sum(1 for v in res.values() if v)
    print(f"    winner '{data.get('titre_vinted')[:40]}' -> {n} images")
    return n > 0


def prepare_fake(account: str, cfg, fake: dict, out_dir: str) -> bool:
    """Titre/desc GÉNÉRIQUES (tout type d'objet) dans la langue du compte + copie des vraies photos."""
    from processor import analyze_fake_item, suggest_price

    os.makedirs(out_dir, exist_ok=True)
    data = analyze_fake_item(fake["photos"][0], cfg.size, cfg.language)
    if not data or not data.get("titre_vinted"):
        print(f"    [ERREUR] analyse fake échouée : {fake['sourceFolder']}")
        return False

    with open(os.path.join(out_dir, "titre.txt"), "w", encoding="utf-8") as f:
        f.write(data.get("titre_vinted", ""))
    with open(os.path.join(out_dir, "description.txt"), "w", encoding="utf-8") as f:
        f.write(data.get("description_vinted", ""))
    # Prix dynamique (Gemini) — fake : volontairement élevé/crédible.
    price = suggest_price("FAKE", data.get("titre_vinted", ""), data.get("description_vinted", ""), cfg.language)
    with open(os.path.join(out_dir, "price.txt"), "w", encoding="utf-8") as f:
        f.write(str(price))

    for src in fake["photos"]:
        _copy_photo_capped(src, os.path.join(out_dir, os.path.basename(src)))
    print(f"    fake {fake['sourceFolder']} '{data.get('titre_vinted')[:40]}' -> {len(fake['photos'])} photos")
    return True


# ---------- Publication (onglet Brave) ----------

def mark_tab(account: str):
    """Place l'onglet Vinted du compte sur ?bot_profile=<account> (repris de publier_tous).

    Renvoie un tuple (status, detail) :
      ("OK", login)              -> onglet trouvé + connecté, navigation effectuée.
      ("LOGGED_OUT", urls)       -> aucun onglet ne correspond au compte voulu, MAIS au
                                    moins un onglet Vinted a renvoyé un 401 = session
                                    déconnectée (garde-fou : à reconnecter avant de relancer).
      ("NOT_FOUND", None)        -> aucun onglet Vinted du compte (ni connecté ni 401).
    """
    from playwright.sync_api import sync_playwright
    want = USERNAME[account].lower()
    logged_out_urls = []  # onglets Vinted dont la session a expiré (HTTP 401)
    p = sync_playwright().start()
    try:
        # connect_over_cdp peut timeouter transitoirement quand Brave est momentanément
        # surchargé (machine 6 Go + nombreux onglets) juste après la génération IA.
        # -> retry court plutôt que crasher toute la salve.
        b = None
        last_err = None
        for attempt in range(1, 4):
            try:
                b = p.chromium.connect_over_cdp(f"http://127.0.0.1:{PORT}", timeout=30000)
                break
            except Exception as e:
                last_err = e
                print(f"  [CDP] connect_over_cdp échec (essai {attempt}/3 : {type(e).__name__}). Retry dans 5s...")
                time.sleep(5)
        if b is None:
            raise RuntimeError(f"connexion CDP impossible après 3 essais : {last_err}")
        ctx = b.contexts[0]
        for pg in ctx.pages:
            if "vinted.fr" not in pg.url.lower():
                continue
            try:
                who = pg.evaluate("""async () => {
                    try {
                        const r = await fetch('/api/v2/users/current', {headers:{'Accept':'application/json'}});
                        if(!r.ok) return 'HTTP_'+r.status;
                        const j = await r.json();
                        return j.user ? j.user.login : 'NO_USER';
                    } catch(e) { return 'ERR'; }
                }""")
            except Exception:
                who = "ERR"
            # Session expirée : on garde l'URL pour aider à identifier le compte à reconnecter.
            if who == "HTTP_401":
                logged_out_urls.append(pg.url)
                continue
            if isinstance(who, str) and who.lower() == want:
                pg.goto(f"https://www.vinted.fr/?bot_profile={account.lower()}",
                        timeout=45000, wait_until="domcontentloaded")
                time.sleep(1)
                b.close()
                return ("OK", who)
        b.close()
        if logged_out_urls:
            return ("LOGGED_OUT", ", ".join(logged_out_urls))
        return ("NOT_FOUND", None)
    finally:
        p.stop()


def publish_one(account: str, product_dir: str, submit: bool) -> bool:
    from vinted_publisher import publish_listing
    return publish_listing(account, product_dir, auto_submit=submit, save_draft=not submit)


def append_sourcing_history(cfg, titre: str, shein_url: str, fiche: str) -> None:
    """Ajoute une ligne au registre Accounts/<compte>/Sourcing_History.md du compte.

    Reproduit EXACTEMENT le format écrit par watcher.py (l'ancien pipeline) et lu par
    vinted-manager/scripts/sync-sourcing.ts (tableau Markdown : col Article = **titre**,
    col Lien = [texte](url), col Fiche = [[fiche]]). C'est ce qui alimente le sourcing
    du Manager : sans cette ligne, l'annonce n'apparaît pas (salve.py ne l'écrivait plus).
    """
    history_path = cfg.history_path
    header_needed = not os.path.exists(history_path)
    with open(history_path, "a", encoding="utf-8") as h:
        if header_needed:
            h.write(f"# 📦 Historique du Sourcing & Commandes Vinted - Compte {cfg.name}\n\n")
            h.write("Ce registre répertorie tous les articles traités par le bot. "
                    "Coche la case correspondante lors d'une commande d'achat suite à une vente.\n\n")
            h.write("| Statut | Date de Sourcing | Article | Lien d'achat Shein | Fiche d'annonce |\n")
            h.write("| :---: | :---: | :---: | :--- | :--- |\n")
        today = time.strftime("%Y-%m-%d")
        h.write(f"| [ ] À commander | {today} | **{titre}** | "
                f"[Lien de l'article Shein]({shein_url}) | [[{fiche}]] |\n")


def record_winner_sourcing(cfg, product_dir: str, source_key: str, winner_path) -> str:
    """Écrit la ligne Sourcing_History.md d'un winner publié (titre lu dans titre.txt +
    URL Shein réelle via sidecar .txt, sinon URL synthétique UNIQUE + fiche). Renvoie le
    titre utilisé. Réutilisé par salve.py (run normal) et republish_failed.py (re-publi)."""
    fiche = os.path.splitext(source_key)[0]
    titre_pub = ""
    tp = os.path.join(product_dir, "titre.txt")
    if os.path.exists(tp):
        with open(tp, encoding="utf-8") as tf:
            titre_pub = tf.read().strip()
    shein_url = routine_pools.sidecar_url(winner_path) if winner_path else None
    if not shein_url:
        safe = re.sub(r"[^a-zA-Z0-9_-]+", "-", fiche).strip("-") or "item"
        shein_url = f"https://fr.shein.com/winner/{safe}"
    append_sourcing_history(cfg, titre_pub or fiche, shein_url, fiche)
    return titre_pub or fiche


# ---------- Orchestration ----------

async def _prepare_account(acc, cfg, order, acc_out):
    """Phase ASYNC : génère/prépare le contenu (images IA).
    Retourne (prepared[(kind,item,dir)], failed_fakes[sourceFolder])."""
    prepared = []
    failed_fakes = []
    for kind, i, item in order:
        if kind == "WINNER":
            d = os.path.join(acc_out, f"w{i}_{os.path.splitext(item['sourceKey'])[0]}")
            ok = await prepare_winner(acc, cfg, item, d)
        else:
            d = os.path.join(acc_out, f"f{i}_{item['sourceFolder']}")
            ok = prepare_fake(acc, cfg, item, d)
            if not ok:
                failed_fakes.append(item["sourceFolder"])
        if ok:
            prepared.append((kind, item, d))
    return prepared, failed_fakes


def run_salve(accounts, n_winners, n_fakes, dry_run, generate_only, submit, use_lock):
    state = routine_state.load_state()
    print("État routine :", json.dumps(routine_state.summary(state), ensure_ascii=False))

    for acc in accounts:
        if acc not in USERNAME:
            print(f"\n[SKIP] compte inconnu : {acc}")
            continue
        cfg = get_account_config(acc)
        winners = routine_state.pick_fresh_winners(state, acc, n_winners)
        fakes = routine_state.pick_fresh_fakes(state, n_fakes)

        print(f"\n===== {acc} ({USERNAME[acc]}, langue={cfg.language}) =====")
        print(f"  winners frais : {[w['sourceKey'] for w in winners]}")
        print(f"  fakes frais   : {[f['sourceFolder'] for f in fakes]}")
        if len(winners) < n_winners:
            print(f"  [WARN] seulement {len(winners)} winners frais dispo pour {acc}")
        if len(fakes) < n_fakes:
            print(f"  [WARN] seulement {len(fakes)} fakes frais dispo (stock global presque épuisé)")

        # Intercalage winner, fake, winner, fake, ...
        order = []
        for i in range(max(len(winners), len(fakes))):
            if i < len(winners):
                order.append(("WINNER", i, winners[i]))
            if i < len(fakes):
                order.append(("FAKE", i, fakes[i]))

        if dry_run:
            print("  [DRY-RUN] ordre de publication :")
            for kind, i, item in order:
                key = item.get("sourceKey") or item.get("sourceFolder")
                print(f"     - {kind:6} {key}")
            # Réservation EN MÉMOIRE (non sauvegardée) pour que le preview des comptes
            # suivants ne repropose pas les mêmes fakes (single-use global).
            for f in fakes:
                routine_state.mark_fake_assigned(state, f["sourceFolder"], acc, status="RESERVED")
            routine_state.record_salve(state, acc, winners, fakes, dry_run=True)
            continue

        acc_out = os.path.join(SALVE_OUT, acc)
        # Réservation EN MÉMOIRE seulement (pas de save) : empêche un autre compte de la
        # même salve de repiocher ces fakes, MAIS un crash avant publication ne les gaspille
        # pas (rien n'est persisté tant que la publication n'a pas réussi -> voir plus bas).
        for f in fakes:
            routine_state.mark_fake_assigned(state, f["sourceFolder"], acc, status="RESERVED")

        # Préparation du contenu : phase ASYNC (génération d'images IA) isolée dans
        # SON PROPRE event loop. On en sort avant de publier : la Sync API de Playwright
        # ne doit JAMAIS tourner dans une boucle asyncio (sinon Playwright lève une erreur).
        prepared, failed_fakes = asyncio.run(_prepare_account(acc, cfg, order, acc_out))

        # Fakes dont l'analyse Gemini a échoué (réponse non parsable) -> marqués FAILED
        # pour ne plus être repiochés (sinon on gaspille un appel Gemini à chaque salve).
        for ff in failed_fakes:
            routine_state.mark_fake_assigned(state, ff, acc, status="FAILED")
        if failed_fakes:
            routine_state.save_state(state)
            print(f"  [FAKE] {len(failed_fakes)} fake(s) écarté(s) (analyse Gemini KO) : {failed_fakes}")

        if generate_only:
            print(f"  [GENERATE-ONLY] {len(prepared)} annonces prêtes dans {acc_out}")
            routine_state.drop_reserved(state)
            routine_state.record_salve(state, acc, winners, fakes, dry_run=False)
            routine_state.save_state(state)
            continue

        # Publication
        locked = manager_lock(acc) if use_lock else False
        try:
            status, detail = mark_tab(acc)
            if status == "LOGGED_OUT":
                print(f"  [DÉCONNECTÉ] compte {acc} ({USERNAME[acc]}) : session Vinted expirée (HTTP 401). "
                      f"Reconnecte-toi dans l'onglet Brave puis relance (--accounts {acc}). Onglet(s) 401 : {detail}")
                continue
            if status != "OK":
                print(f"  [WARN] onglet {acc} ({USERNAME[acc]}) introuvable -> compte non ouvert ? Salve sautée.")
                continue
            for j, (kind, item, d) in enumerate(prepared):
                # Anti-cascade : une annonce qui échoue (ex. fake « poison » exigeant une taille)
                # casse le marqueur d'onglet maître -> toutes les suivantes échouent
                # ("onglet maitre introuvable"). On RÉARME le marqueur avant chaque annonce
                # (sauf la 1re, déjà armée juste au-dessus). Repris de republish_failed.py.
                if j > 0:
                    status, _ = mark_tab(acc)
                    if status != "OK":
                        print(f"  [WARN] réarmement onglet {acc} échoué ({status}) avant l'annonce "
                              f"{j+1} -> arrêt de ce compte (les suivantes restent en attente).")
                        break
                print(f"  [PUBLISH {j+1}/{len(prepared)}] {kind} {os.path.basename(d)}")
                try:
                    ok = publish_one(acc, d, submit)
                except Exception as e:
                    print(f"    [ERREUR] publication : {e}")
                    ok = False
                if ok:
                    if kind == "WINNER":
                        routine_state.mark_winner_published(state, item["sourceKey"], acc)
                        # Enregistre l'identité produit (URL+dHash) -> anti re-scrape de la même robe.
                        routine_state.register_winner_product(state, item["sourceKey"], item.get("path"))
                        # Enregistrement dans le sourcing du Manager (via Sourcing_History.md ->
                        # sync-sourcing.ts). Sans ça, l'annonce n'apparaît pas dans le sourcing.
                        try:
                            titre_pub = record_winner_sourcing(cfg, d, item["sourceKey"], item.get("path"))
                            print(f"    [SOURCING] winner enregistré ({acc}) : {titre_pub[:40]}")
                        except Exception as e:
                            print(f"    [SOURCING] [WARN] écriture Sourcing_History échouée : {e}")
                    else:
                        routine_state.mark_fake_assigned(state, item["sourceFolder"], acc, status="PUBLISHED")
                    routine_state.save_state(state)
                if j < len(prepared) - 1:
                    pause = random.uniform(15, 30)
                    print(f"    pause anti-bot {int(pause)}s...")
                    time.sleep(pause)
        except Exception as e:
            print(f"  [ERREUR] compte {acc} interrompu ({type(e).__name__}: {e}). "
                  f"Fakes réservés libérés, passage au compte suivant.")
            routine_state.drop_reserved(state)
            continue
        finally:
            if locked:
                manager_unlock(acc)

        routine_state.drop_reserved(state)  # libère les fakes réservés non publiés (échecs)
        routine_state.record_salve(state, acc, winners, fakes, dry_run=False)
        routine_state.save_state(state)

        # Pause entre comptes
        if acc != accounts[-1]:
            pause = random.uniform(20, 40)
            print(f"  pause inter-compte {int(pause)}s...")
            time.sleep(pause)

    print("\n===== Salve terminée =====")
    print("État final :", json.dumps(routine_state.summary(state), ensure_ascii=False))


def main():
    ap = argparse.ArgumentParser(description="Salve de publication Vinted (routine 5+5)")
    ap.add_argument("--accounts", nargs="*", default=AUTOMATION_ACCOUNTS,
                    help="comptes (défaut : comptes d'automatisation nina/lena/orane ; yazz/emma sortis)")
    ap.add_argument("--winners", type=int, default=5, help="nb de winners par compte")
    ap.add_argument("--fakes", type=int, default=5, help="nb de fakes par compte")
    ap.add_argument("--dry-run", action="store_true", help="plan seulement (pioche + intercalage)")
    ap.add_argument("--generate-only", action="store_true", help="génère le contenu, ne publie pas")
    ap.add_argument("--submit", action="store_true", help="publie en RÉEL (sinon brouillon)")
    ap.add_argument("--lock", action="store_true", help="pose le verrou manager pendant la publication")
    args = ap.parse_args()

    # run_salve est SYNC : la génération (async) tourne dans des event loops isolés
    # via asyncio.run() par compte ; la publication (Playwright sync) reste hors boucle.
    run_salve(
        accounts=args.accounts,
        n_winners=args.winners,
        n_fakes=args.fakes,
        dry_run=args.dry_run,
        generate_only=args.generate_only,
        submit=args.submit,
        use_lock=args.lock,
    )


if __name__ == "__main__":
    main()
