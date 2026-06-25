"""
winner_prices.py — Override manuel du prix par winner (robe).

Lit winner_prices.json : { "<nom_fichier_winner>": <override> }
où <override> vaut :
  - null            -> prix automatique (Gemini, fourchette WINNER_PRICE_RANGE 40-80€)
  - un nombre (ex 120)  -> PRIX FIXE imposé
  - [min, max] (ex [80,150]) -> fourchette custom (Gemini choisit dedans, modulé par les ventes)

Les clés commençant par "_" (ex "_comment") sont ignorées.
Permet de pousser plus cher les robes qui se vendent beaucoup plus.
"""
import os
import json

BOT = os.path.dirname(os.path.abspath(__file__))
PATH = os.path.join(BOT, "winner_prices.json")


def load_overrides() -> dict:
    if not os.path.exists(PATH):
        return {}
    try:
        with open(PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        return {k: v for k, v in data.items() if not k.startswith("_")}
    except Exception:
        return {}


def get_override(source_key: str):
    """Retourne None (prix auto), un nombre (prix fixe), ou [min,max] (fourchette custom)."""
    ov = load_overrides().get(source_key)
    if isinstance(ov, (int, float)):
        return int(ov)
    if isinstance(ov, (list, tuple)) and len(ov) == 2:
        return [int(ov[0]), int(ov[1])]
    return None
