"""
routine_state.py — État local de la routine (JSON), migrable vers le manager.

- winners : conso PAR COMPTE. Un winner peut servir plusieurs comptes, mais une
  seule fois par compte (mannequin/fond différents). state["winners"][sourceKey]["used_by"].
- fakes   : SINGLE-USE GLOBAL. Un fake assigné n'est plus jamais proposé.
  state["fakes"][sourceFolder] = {assigned_to, assigned_at, status}.

Toute la pioche passe par ici -> quand on déploiera le manager, il suffira de
remplacer load/save + les pick_* par des appels API (mêmes clés sourceKey/sourceFolder).
"""
import os
import json
import datetime

import routine_pools

BOT = os.path.dirname(os.path.abspath(__file__))
STATE_PATH = os.path.join(BOT, "routine_state.json")

_EMPTY = {"version": 1, "winners": {}, "fakes": {}, "salves": []}


def _now() -> str:
    return datetime.datetime.now().isoformat(timespec="seconds")


def load_state() -> dict:
    if not os.path.exists(STATE_PATH):
        return json.loads(json.dumps(_EMPTY))
    try:
        with open(STATE_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        for k, v in _EMPTY.items():
            data.setdefault(k, json.loads(json.dumps(v)))
        return data
    except Exception:
        return json.loads(json.dumps(_EMPTY))


def save_state(state: dict) -> None:
    tmp = STATE_PATH + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False, indent=2)
    os.replace(tmp, STATE_PATH)  # écriture atomique


# ---- WINNERS (conso par compte) ----

def winner_used_by(state: dict, source_key: str) -> list:
    return state["winners"].get(source_key, {}).get("used_by", [])


def pick_fresh_winners(state: dict, account: str, n: int) -> list:
    """n winners pas encore utilisés par `account`, en répartissant l'usage global
    (les moins utilisés d'abord) pour ne pas surexposer le même produit."""
    winners = routine_pools.list_winners()
    candidates = [w for w in winners if account not in winner_used_by(state, w["sourceKey"])]
    candidates.sort(key=lambda w: (len(winner_used_by(state, w["sourceKey"])), w["sourceKey"]))
    return candidates[:n]


def mark_winner_published(state: dict, source_key: str, account: str) -> None:
    entry = state["winners"].setdefault(source_key, {"used_by": []})
    if account not in entry["used_by"]:
        entry["used_by"].append(account)


# ---- FAKES (single-use global) ----

def fake_is_available(state: dict, source_folder: str) -> bool:
    return source_folder not in state["fakes"]


def pick_fresh_fakes(state: dict, n: int) -> list:
    """n fakes globalement non assignés (FIFO sur l'ordre des dossiers)."""
    fakes = routine_pools.list_fakes()
    return [f for f in fakes if fake_is_available(state, f["sourceFolder"])][:n]


def mark_fake_assigned(state: dict, source_folder: str, account: str, status: str = "PUBLISHED") -> None:
    state["fakes"][source_folder] = {
        "assigned_to": account,
        "assigned_at": _now(),
        "status": status,
    }


def drop_reserved(state: dict) -> None:
    """Libère les fakes RESERVED non aboutis (la réservation est intra-run seulement ;
    seuls PUBLISHED et FAILED doivent persister)."""
    for k in [k for k, v in state["fakes"].items() if v.get("status") == "RESERVED"]:
        del state["fakes"][k]


# ---- Journal ----

def record_salve(state: dict, account: str, winners: list, fakes: list, dry_run: bool) -> None:
    state["salves"].append({
        "ts": _now(),
        "account": account,
        "dry_run": dry_run,
        "winners": [w["sourceKey"] for w in winners],
        "fakes": [f["sourceFolder"] for f in fakes],
    })


# ---- Diagnostic ----

def summary(state: dict) -> dict:
    fakes_total = len(routine_pools.list_fakes())
    winners_total = len(routine_pools.list_winners())
    fakes_used = len(state["fakes"])
    return {
        "winners_total": winners_total,
        "fakes_total": fakes_total,
        "fakes_used": fakes_used,
        "fakes_available": fakes_total - fakes_used,
        "salves_run": len(state["salves"]),
    }


if __name__ == "__main__":
    st = load_state()
    print("État routine :", json.dumps(summary(st), indent=2, ensure_ascii=False))
    for acc in ["emma", "Yazz", "nina", "lena", "orane"]:
        w = pick_fresh_winners(st, acc, 5)
        f = pick_fresh_fakes(st, 5)
        print(f"  {acc:6} -> 5 winners: {[x['sourceKey'][-12:] for x in w]}")
        print(f"         -> 5 fakes  : {[x['sourceFolder'] for x in f]}")
