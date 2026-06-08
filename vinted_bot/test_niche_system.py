"""
test_niche_system.py — Test local du systeme de niches agnostique.

Ne lance AUCUN navigateur, AUCUN compte, AUCUNE API. Pure validation logique.
Lance avec : python3 test_niche_system.py

Verifie :
  1. Chargement des 4 niches (garment, stroller, deco, tech)
  2. Backward-compat : garment & stroller ont les memes mots-cles que l'ancien code hardcode
  3. Construction du prompt (substitution + .format) sans KeyError, et pas de fuite de taille
  4. Cles de recette d'images toutes reconnues par le dispatch
  5. Filtrage mots-cles simule sur des URLs Shein d'exemple
"""

import sys
from niche_loader import load_niche, list_available_niches

# --- Valeurs hardcodees originales (avant refactor) pour la verif backward-compat ---
LEGACY = {
    "garment": {
        "include": ["dress", "robe", "skirt", "jupe"],
        "exclude": ["swim", "bikini", "maillot", "beachwear", "bodysuit", "romper", "jumpsuit"],
        "uses_size": True,
    },
    "stroller": {
        "include": ["stroller", "poussette", "buggy", "hondenbuggy", "pet", "chien", "dog"],
        "exclude": [],
        "uses_size": False,
    },
}

# Cles de recette reconnues par le dispatch (chatgpt_upscaler.py)
KNOWN_RECIPE_KEYS = {
    "selfie", "flat_lay", "hanger", "profile", "folded", "selfie_hand_in_hair",
    "stroller_domestic", "stroller_with_dog",
    "product_on_surface", "product_in_context",
}

# URLs Shein d'exemple pour tester le filtrage par niche
SAMPLE_URLS = {
    "garment": [
        ("https://fr.shein.com/floral-summer-dress-robe-p-123.html", True),   # include dress/robe
        ("https://fr.shein.com/bikini-swim-set-p-456.html", False),           # exclude bikini/swim
        ("https://fr.shein.com/leather-handbag-p-789.html", False),           # ni include ni exclude -> rejete
    ],
    "stroller": [
        ("https://fr.shein.com/foldable-dog-stroller-poussette-p-1.html", True),
        ("https://fr.shein.com/cat-toy-p-2.html", False),
    ],
}


def replicate_keyword_filter(url_lower, include, exclude):
    """Replique EXACTEMENT la logique de scraper.py:317-319."""
    if exclude and any(w in url_lower for w in exclude):
        return False
    if include and not any(w in url_lower for w in include):
        return False
    return True


def build_prompt(niche_def, size="M", language="fr"):
    """Replique processor.py:262-270 (construction + format)."""
    persona = f"Tu es une vendeuse reguliere sur Vinted ({language})."
    instructions_langue = f"Redige dans la langue '{language}'."
    phrases_typiques = ""
    substitutions = {
        "PERSONA": persona,
        "CONSIGNES_LANGUE": instructions_langue,
        "PHRASES_TYPIQUES": phrases_typiques,
        "TAILLE_CIBLE": size,
    }
    declared = niche_def.analysis_prompt_variables
    format_kwargs = {k: v for k, v in substitutions.items() if k in declared}
    return niche_def.analysis_prompt.format(**format_kwargs)


def main():
    failures = []

    print("=" * 60)
    print("TEST 1 — Niches disponibles")
    print("=" * 60)
    available = sorted(list_available_niches())
    print(f"Trouvees : {available}")
    for expected in ["garment", "stroller", "deco", "tech"]:
        if expected not in available:
            failures.append(f"Niche manquante : {expected}")

    print("\n" + "=" * 60)
    print("TEST 2 — Backward-compat garment & stroller")
    print("=" * 60)
    for niche, legacy in LEGACY.items():
        d = load_niche(niche)
        ok_inc = d.keywords_include == legacy["include"]
        ok_exc = d.keywords_exclude == legacy["exclude"]
        ok_size = d.uses_size == legacy["uses_size"]
        print(f"  {niche:9} include={'OK' if ok_inc else 'KO'} "
              f"exclude={'OK' if ok_exc else 'KO'} uses_size={'OK' if ok_size else 'KO'}")
        if not ok_inc:
            failures.append(f"{niche}: keywords_include != legacy ({d.keywords_include})")
        if not ok_exc:
            failures.append(f"{niche}: keywords_exclude != legacy ({d.keywords_exclude})")
        if not ok_size:
            failures.append(f"{niche}: uses_size != legacy ({d.uses_size})")

    print("\n" + "=" * 60)
    print("TEST 3 — Construction prompt (toutes niches)")
    print("=" * 60)
    for niche in available:
        d = load_niche(niche)
        try:
            prompt = build_prompt(d)
            # Verif : si TAILLE_CIBLE pas declaree, la taille ne doit pas fuiter
            leak = ("TAILLE_CIBLE" not in d.analysis_prompt_variables) and ("Taille : M" in prompt)
            has_placeholder_left = "{" in prompt and "}" in prompt
            status = "OK"
            if has_placeholder_left:
                status = "KO (placeholder non substitue)"
                failures.append(f"{niche}: placeholder restant dans le prompt")
            if leak:
                status = "KO (fuite de taille)"
                failures.append(f"{niche}: taille injectee alors que non declaree")
            print(f"  {niche:9} format={status}  vars={d.analysis_prompt_variables}")
        except KeyError as e:
            print(f"  {niche:9} KO — KeyError {e}")
            failures.append(f"{niche}: KeyError {e} a la construction du prompt")

    print("\n" + "=" * 60)
    print("TEST 4 — Cles de recette d'images reconnues")
    print("=" * 60)
    for niche in available:
        d = load_niche(niche)
        unknown = [k for k in d.image_recipe if k not in KNOWN_RECIPE_KEYS]
        status = "OK" if not unknown else f"KO (inconnues: {unknown})"
        print(f"  {niche:9} recipe={d.image_recipe} -> {status}")
        if unknown:
            failures.append(f"{niche}: cles de recette inconnues {unknown}")
        # Verif coherence output_images
        for k in d.image_recipe:
            if k not in d.output_images:
                failures.append(f"{niche}: recipe key '{k}' absente de output_images")

    print("\n" + "=" * 60)
    print("TEST 5 — Filtrage mots-cles simule sur URLs Shein")
    print("=" * 60)
    for niche, cases in SAMPLE_URLS.items():
        d = load_niche(niche)
        for url, expected_keep in cases:
            kept = replicate_keyword_filter(url.lower(), d.keywords_include, d.keywords_exclude)
            status = "OK" if kept == expected_keep else "KO"
            verdict = "GARDE" if kept else "REJETE"
            print(f"  {niche:9} {verdict:6} (attendu {'GARDE' if expected_keep else 'REJETE'}) {status}  {url[:55]}")
            if kept != expected_keep:
                failures.append(f"{niche}: filtrage incorrect pour {url}")

    print("\n" + "=" * 60)
    if failures:
        print(f"RESULTAT : {len(failures)} ECHEC(S)")
        for f in failures:
            print(f"  - {f}")
        sys.exit(1)
    else:
        print("RESULTAT : TOUS LES TESTS PASSENT")
        sys.exit(0)


if __name__ == "__main__":
    main()
