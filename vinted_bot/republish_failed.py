"""
republish_failed.py — Re-publie les annonces d'une salve qui ont ÉCHOUÉ, sans
repasser par la génération IA (réutilise le contenu déjà dans _salve_out/).

Pourquoi : le publisher repère l'onglet du compte via le marqueur d'URL
`?bot_profile=<compte>`, réarmé par une nav "retour accueil" en try/except.
Quand cette nav échoue (timeout/ERR_ABORTED), le marqueur n'est pas réarmé et
TOUTES les annonces suivantes du compte échouent ("onglet maitre introuvable").
Ici on RÉARME le marqueur (salve.mark_tab) AVANT CHAQUE annonce -> pas de cascade.

Idempotent : ne publie QUE les dossiers _salve_out/<compte>/* SANS published.txt.

Usage :
  WINNERS_DIR=... python republish_failed.py --account orane [--account lena ...]
"""
import os
import sys
import time
import json
import random
import argparse

try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

import salve
import routine_pools
import routine_state

BOT = os.path.dirname(os.path.abspath(__file__))
SALVE_OUT = os.path.join(BOT, "_salve_out")

# Fakes bannis : échouent systématiquement à la publication (mauvaise catégorie /
# formulaire Vinted) et bloquent le reste du compte par effet cascade.
#   Produit_14 = "Brosse à ongles en plastique bleu" (signalé par l'utilisateur).
BANNED_FAKES = {"Produit_14"}


def _winner_key_from_stem(stem: str) -> str:
    """Retrouve le sourceKey exact (avec extension) d'un winner via le pool."""
    for w in routine_pools.list_winners():
        if os.path.splitext(w["sourceKey"])[0] == stem:
            return w["sourceKey"]
    return stem  # fallback (sans extension)


def pending_dirs(account: str) -> list:
    """Dossiers d'annonces générées non encore publiées (pas de published.txt)."""
    base = os.path.join(SALVE_OUT, account)
    if not os.path.isdir(base):
        return []
    out = []
    for rel in sorted(os.listdir(base)):
        d = os.path.join(base, rel)
        if not os.path.isdir(d):
            continue
        if os.path.exists(os.path.join(d, "published.txt")):
            continue  # déjà publié
        # un dossier valide a au moins titre.txt + une image
        if not os.path.exists(os.path.join(d, "titre.txt")):
            continue
        out.append(rel)
    return out


def republish_account(account: str, explicit_dirs: list | None = None) -> tuple:
    state = routine_state.load_state()
    # Mode explicite : on ne touche QUE les dossiers fournis (sécurité — _salve_out
    # accumule les salves passées ; un scan aveugle re-publierait de vieux items).
    if explicit_dirs:
        rels = [r for r in explicit_dirs
                if os.path.isdir(os.path.join(SALVE_OUT, account, r))
                and not os.path.exists(os.path.join(SALVE_OUT, account, r, "published.txt"))]
    else:
        rels = pending_dirs(account)
    if not rels:
        print(f"[{account}] aucune annonce en attente (toutes ont published.txt).")
        return (0, 0)
    print(f"[{account}] {len(rels)} annonce(s) à re-publier : {rels}")

    ok_count = 0
    for j, rel in enumerate(rels):
        d = os.path.join(SALVE_OUT, account, rel)
        is_winner = rel.startswith("w")
        kind = "WINNER" if is_winner else "FAKE"
        suffix = rel.split("_", 1)[1] if "_" in rel else rel
        key = _winner_key_from_stem(suffix) if is_winner else suffix

        # Garde-fous FAKE (single-use global) :
        if not is_winner:
            if key in BANNED_FAKES:
                print(f"  [SKIP] {kind} {rel} : fake banni (bloque la publication).")
                continue
            assigned = state["fakes"].get(key)
            if assigned and assigned.get("assigned_to") != account:
                print(f"  [SKIP] {kind} {rel} : déjà assigné à {assigned.get('assigned_to')} "
                      f"(single-use global).")
                continue

        # RÉARME le marqueur bot_profile AVANT CHAQUE annonce (anti-cascade).
        status, detail = salve.mark_tab(account)
        if status == "LOGGED_OUT":
            print(f"  [{account}] session expirée (401) : reconnecte puis relance. {detail}")
            break
        if status != "OK":
            print(f"  [{account}] onglet introuvable ({status}). Abandon.")
            break

        print(f"  [PUBLISH {j+1}/{len(rels)}] {kind} {rel}  (key={key})")
        try:
            ok = salve.publish_one(account, d, submit=True)
        except Exception as e:
            print(f"    [ERREUR] {e}")
            ok = False

        if ok:
            ok_count += 1
            if is_winner:
                routine_state.mark_winner_published(state, key, account)
                routine_state.register_winner_product(state, key)
            else:
                routine_state.mark_fake_assigned(state, key, account, status="PUBLISHED")
            routine_state.save_state(state)
            print("    [OK] publié + état mis à jour.")
        else:
            print("    [ÉCHEC] non publié (état inchangé).")

        if j < len(rels) - 1:
            pause = random.uniform(15, 30)
            print(f"    pause anti-bot {int(pause)}s...")
            time.sleep(pause)

    print(f"[{account}] terminé : {ok_count}/{len(rels)} re-publiées.")
    return (ok_count, len(rels))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--account", required=True, help="compte à traiter")
    ap.add_argument("--dirs", default="", help="dossiers explicites (séparés par des virgules) "
                    "relatifs à _salve_out/<compte>/. Vide = scan auto des non-publiés.")
    args = ap.parse_args()
    acc = args.account
    if acc not in salve.USERNAME:
        print(f"[SKIP] compte inconnu : {acc}")
        return
    explicit = [d.strip() for d in args.dirs.split(",") if d.strip()] or None
    o, n = republish_account(acc, explicit_dirs=explicit)
    print(f"\n===== {acc} : re-publication terminée : {o}/{n} =====")


if __name__ == "__main__":
    main()
