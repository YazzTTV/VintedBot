"""
niche_loader.py — Charge la definition de niche depuis niche_definitions/<name>.json.

Une definition de niche contient :
  name                    : identifiant interne (str)
  display_name            : libelle lisible (str)
  default_start_url       : URL Shein de depart pour le scraper (str)
  keywords_include        : mots-cles requis dans l'URL produit (list[str])
  keywords_exclude        : mots-cles interdits dans l'URL produit (list[str])
  uses_size               : si True, le publisher selectionne le champ Taille (bool)
  analysis_prompt         : template de prompt Gemini, placeholders optionnels :
                            {PERSONA}, {CONSIGNES_LANGUE}, {PHRASES_TYPIQUES}, {TAILLE_CIBLE}
  analysis_prompt_variables : liste des placeholders declares dans le prompt (list[str])
  image_recipe            : liste ordonnee des cles de generation d'images (list[str])
  output_images           : mapping recipe_key -> nom de fichier de sortie (dict)

Cles de recette reconnues :
  - Garment   : selfie, flat_lay, hanger, profile, folded, selfie_hand_in_hair
  - Stroller  : stroller_domestic, stroller_with_dog
  - Generique : product_on_surface, product_in_context
    (ces deux cles generiques reutilisent flat_lay/folded avec des prompts adaptes
     a la niche — cf. chatgpt_upscaler.py dispatch map)
"""

import os
import json

_DEFINITIONS_DIR = os.path.join(os.path.dirname(__file__), "niche_definitions")


class NicheDefinition:
    """Wrapper autour du JSON de definition de niche."""

    def __init__(self, data: dict):
        self.name: str = data["name"]
        self.display_name: str = data.get("display_name", self.name)
        self.default_start_url: str = data["default_start_url"]
        self.keywords_include: list = data.get("keywords_include", [])
        self.keywords_exclude: list = data.get("keywords_exclude", [])
        self.uses_size: bool = data.get("uses_size", True)
        self.analysis_prompt: str = data["analysis_prompt"]
        self.analysis_prompt_variables: list = data.get("analysis_prompt_variables", [])
        self.image_recipe: list = data.get("image_recipe", [])
        self.output_images: dict = data.get("output_images", {})

    def __repr__(self):
        return f"<NicheDefinition name={self.name!r} recipe={self.image_recipe}>"


def load_niche(niche_name: str) -> NicheDefinition:
    """
    Charge et retourne la NicheDefinition correspondant a niche_name.
    Leve FileNotFoundError si le fichier n'existe pas.
    """
    path = os.path.join(_DEFINITIONS_DIR, f"{niche_name}.json")
    if not os.path.exists(path):
        raise FileNotFoundError(
            f"[NicheLoader] Definition introuvable pour la niche '{niche_name}'. "
            f"Fichier attendu : {path}\n"
            f"Niches disponibles : {list_available_niches()}"
        )
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return NicheDefinition(data)


def list_available_niches() -> list:
    """Retourne la liste des noms de niches disponibles (sans extension)."""
    if not os.path.isdir(_DEFINITIONS_DIR):
        return []
    return [
        os.path.splitext(f)[0]
        for f in os.listdir(_DEFINITIONS_DIR)
        if f.endswith(".json")
    ]
