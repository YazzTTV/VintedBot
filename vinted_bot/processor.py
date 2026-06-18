"""
Analyse une capture produit Shein via Gemini Web (Edge CDP).
Remplace l'appel API Gemini par une automatisation Playwright,
ce qui evite les limites du free tier.
"""
import json
import re

# Imports legacy de l'ancienne version "Gemini Web" (Playwright + Edge CDP).
# L'analyse passe desormais par l'API Gemini native (google-genai) et n'en a plus
# besoin. On les rend optionnels pour ne pas casser l'import si playwright/edge_browser
# sont absents, tout en preservant les noms si du code legacy les utilise encore.
try:
    from playwright.sync_api import sync_playwright
    from edge_browser import start_edge, open_gemini_page, upload_files, type_and_send, wait_for_response, get_last_response_text
except Exception:
    sync_playwright = None
    start_edge = open_gemini_page = upload_files = type_and_send = wait_for_response = get_last_response_text = None

PROMPT_ANALYSE = """{PERSONA}
Je te donne une capture d'ecran d'un vetement sur un site e-commerce (Shein).

IMPORTANT : Ne mentionne JAMAIS la marque du site d'origine (Shein, Temu, AliExpress, etc.) dans le titre ou la description. Le nom de la marque ne doit figurer sous aucun pretexte.

IMPORTANT : Ne cree aucun fichier, document Google Docs ou PDF. N'utilise aucun outil. Reponds directement en texte brut.

Effectue les taches suivantes :
1. Identifie le vetement (type, couleur, matiere apparente, style).
2. Redige un titre clair et sympa pour Vinted (max 40 caracteres). {CONSIGNES_LANGUE} IMPORTANT : N'utilise AUCUN emoji (pas de smileys, pas de coeurs, etc.).
3. Redige une description COURTE et CONCISE pour Vinted (maximum 3 à 4 courtes phrases simples). Le ton doit etre naturel, chaleureux, professionnel mais pas du tout robotique. N'utilise AUCUN hashtag (#) et N'utilise AUCUN emoji. {PHRASES_TYPIQUES} Precise obligatoirement l'etat, la taille (selon les consignes ci-dessous) et la matiere.
4. Propose un court prompt en anglais decrivant uniquement le design, la coupe et les motifs du vetement (ex: "A long floral summer dress with a v-neck").

Consignes pour les données :
- Etat : Neuf
- Taille : {TAILLE_CIBLE}

Formate obligatoirement ta reponse avec ces balises precises :

[TITRE_VINTED]
(titre ici)
[/TITRE_VINTED]

[DESCRIPTION_VINTED]
(description ici)
[/DESCRIPTION_VINTED]

[PROMPT_IMAGE_ANGLAIS]
(prompt ici)
[/PROMPT_IMAGE_ANGLAIS]"""


PROMPT_ANALYSE_STROLLER = """{PERSONA}
Je te donne une capture d'ecran d'une poussette pour chien sur un site e-commerce (Shein).

IMPORTANT : Ne mentionne JAMAIS la marque du site d'origine (Shein, Temu, AliExpress, etc.) dans le titre ou la description. Le nom de la marque ne doit figurer sous aucun pretexte.

IMPORTANT : Ne cree aucun fichier, document Google Docs ou PDF. N'utilise aucun outil. Reponds directement en texte brut.

Effectue les taches suivantes :
1. Identifie la poussette (type, couleur, materiaux apparents, fonctionnalites comme pliable, panier de rangement, etc.).
2. Redige un titre clair et sympa pour Vinted (max 40 caracteres). {CONSIGNES_LANGUE} IMPORTANT : N'utilise AUCUN emoji (pas de smileys, pas de coeurs, etc.).
3. Redige une description COURTE et CONCISE pour Vinted (maximum 3 à 4 courtes phrases simples). Le ton doit etre naturel, chaleureux, professionnel mais pas du tout robotique. N'utilise AUCUN hashtag (#) et N'utilise AUCUN emoji. {PHRASES_TYPIQUES} Precise obligatoirement l'etat (Neuf dans son emballage d'origine) et les fonctionnalites pratiques (pliable, roues robustes, espace confortable pour l'animal).
4. Propose un court prompt en anglais decrivant uniquement le design, la couleur et la structure de la poussette (ex: "A modern black lightweight foldable dog stroller with four wheels and a mesh window").

Formate obligatoirement ta reponse avec ces balises precises :

[TITRE_VINTED]
(titre ici)
[/TITRE_VINTED]

[DESCRIPTION_VINTED]
(description ici)
[/DESCRIPTION_VINTED]

[PROMPT_IMAGE_ANGLAIS]
(prompt ici)
[/PROMPT_IMAGE_ANGLAIS]"""


def _clean_forbidden_words(text: str) -> str:
    """
    Nettoie agressivement les mentions de marques d'origine interdites
    (Shein, Temu, etc.) pour preserver la valeur percue sur Vinted.
    """
    if not text:
        return ""
    
    # Liste noire des marques concurrentes ou low-cost (insensible a la casse)
    forbidden = r'\b(?:shein|temu|aliexpress|ali\s+express)\b'
    
    # 1. Suppression des mots interdits
    cleaned = re.sub(forbidden, '', text, flags=re.IGNORECASE)
    
    # 2. Correction de la ponctuation orpheline
    cleaned = re.sub(r'\s*-\s*-\s*', ' - ', cleaned) # Collapser les tirets doubles "- -"
    cleaned = re.sub(r'\s+,\s*', ', ', cleaned) # Collapser l'espace avant virgule " ,"
    
    # 3. Nettoyage des espaces en surplus et orphelins
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    
    # 4. Nettoyage des ponctuations orphelines en debut/fin
    cleaned = re.sub(r'\s*[,-]\s*$', '', cleaned)
    cleaned = re.sub(r'^\s*[,-]\s*', '', cleaned)
    
    return cleaned.strip()


def _parse_gemini_response(raw_text: str) -> dict | None:
    """
    Extrait les informations de la reponse brute de Gemini.
    Fait un parsing ultra-robuste supportant 3 formats.
    Desinfecte automatiquement le titre et la description contre les marques interdites.
    """
    parsed_data = None

    # --- Format 1 : Balises explicites ---
    titre_match = re.search(r'\[TITRE_VINTED\]\s*(.*?)\s*\[/TITRE_VINTED\]', raw_text, re.DOTALL | re.IGNORECASE)
    desc_match = re.search(r'\[DESCRIPTION_VINTED\]\s*(.*?)\s*\[/DESCRIPTION_VINTED\]', raw_text, re.DOTALL | re.IGNORECASE)
    prompt_match = re.search(r'\[PROMPT_IMAGE_ANGLAIS\]\s*(.*?)\s*\[/PROMPT_IMAGE_ANGLAIS\]', raw_text, re.DOTALL | re.IGNORECASE)

    if titre_match or desc_match or prompt_match:
        print("[Processor] Extraction reussie via balises explicites.")
        parsed_data = {
            "titre_vinted": titre_match.group(1).strip() if titre_match else "Annonce Vinted",
            "description_vinted": desc_match.group(1).strip() if desc_match else "",
            "prompt_image_anglais": prompt_match.group(1).strip() if prompt_match else "A nice clothing item"
        }

    # --- Format 2 : Structure naturelle (Titre, Description, Prompt) ---
    print("[Processor] Balises absentes. Tentative de parsing naturel...")
    lines = [line.strip() for line in raw_text.split('\n')]
    titre = "Annonce Vinted"
    desc = ""
    prompt_eng = "A nice clothing item"

    # Extraction du titre
    for i, line in enumerate(lines):
        if re.search(r'(?:Titre Vinted|Titre)\s*:?', line, re.IGNORECASE):
            # Chercher le titre sur les lignes suivantes
            for offset in [1, 2]:
                if i + offset < len(lines) and lines[i + offset]:
                    titre = lines[i + offset]
                    break
            break

    # Extraction de la description
    for i, line in enumerate(lines):
        if re.search(r'(?:Description Vinted|Description)\s*:?', line, re.IGNORECASE):
            desc_lines = []
            for j in range(i + 1, len(lines)):
                next_line = lines[j]
                # S'arreter si on arrive a une autre section (Prompt, Image, Anglais, etc.)
                if re.search(r'^\s*(?:\d\.\s*)?(?:Prompt|Image|Anglais|Identification|4\.)', next_line, re.IGNORECASE):
                    break
                desc_lines.append(next_line)
            desc = "\n".join(desc_lines).strip()
            break

    # Extraction du prompt anglais
    for i, line in enumerate(lines):
        if re.search(r'(?:Prompt anglais|Prompt en anglais|Prompt|4\.)\s*:?', line, re.IGNORECASE):
            for offset in [1, 2]:
                if i + offset < len(lines) and lines[i + offset]:
                    prompt_eng = lines[i + offset]
                    break
            break

    if not parsed_data and len(desc) > 30:
        # Nettoyage des eventuels numeros ou puces sur le titre (ex: "2. Robe..." -> "Robe...")
        titre = re.sub(r'^\d+\.\s*', '', titre).strip()
        print("[Processor] Extraction reussie via format naturel.")
        parsed_data = {
            "titre_vinted": titre,
            "description_vinted": desc,
            "prompt_image_anglais": prompt_eng
        }

    # --- Format 3 : Fallback JSON ---
    if not parsed_data:
        try:
            match = re.search(r'\{.*\}', raw_text, re.DOTALL)
            if match:
                js = json.loads(match.group(0))
                print("[Processor] Extraction reussie via fallback JSON.")
                parsed_data = {
                    "titre_vinted": js.get("titre_vinted", "Annonce Vinted"),
                    "description_vinted": js.get("description_vinted", ""),
                    "prompt_image_anglais": js.get("prompt_image_anglais", "A nice clothing item")
                }
        except Exception:
            pass

    # --- ETAPE ULTIME : DESINFECTION CONTRE LES MARQUES INTERDITES ---
    if parsed_data:
        raw_titre = parsed_data["titre_vinted"]
        raw_desc = parsed_data["description_vinted"]
        
        cleaned_titre = _clean_forbidden_words(raw_titre)
        cleaned_desc = _clean_forbidden_words(raw_desc)
        
        # Log discret si on a intercepte et nettoye un mot interdit
        if cleaned_titre != raw_titre:
            print(f"[Processor] [SÉCURITÉ] Nettoyage du titre : '{raw_titre}' -> '{cleaned_titre}'")
        if cleaned_desc != raw_desc:
            print("[Processor] [SÉCURITÉ] Nettoyage de la description (mention de marque supprimee).")
            
        parsed_data["titre_vinted"] = cleaned_titre
        parsed_data["description_vinted"] = cleaned_desc
        
        return parsed_data

    print(f"[Processor] Impossible de parser la reponse. Sauvegarde de la reponse brute dans raw_response.txt")
    with open("raw_response.txt", "w", encoding="utf-8") as f:
        f.write(raw_text)
    return None


def analyze_screenshot(image_path: str, size: str = "S", language: str = "fr", niche: str = "garment") -> dict | None:
    """
    Analyse une capture produit Shein via l'API officielle google-genai.
    Retourne un dict {titre_vinted, description_vinted, prompt_image_anglais}
    ou None en cas d'echec.
    Supports multi-language prompt adaptation ("fr", "nl", "lb", etc.)
    """
    import os
    from google import genai
    from google.genai import types
    from dotenv import load_dotenv

    load_dotenv()
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("[Processor] ERREUR : GEMINI_API_KEY introuvable dans .env")
        return None

    print(f"[Processor] Analyse de l'image via Gemini API Native : {image_path} (Taille : {size}, Langue : {language.upper()}, Niche : {niche.upper()})...")
    
    # --- DEFINITION DU PERSONA ET DES REGLES DE LANGUE ---
    persona = "Tu es une vendeuse reguliere et tres humaine sur Vinted."
    instructions_langue = "Rédige le titre et la description EXCLUSIVEMENT en Français."
    phrases_typiques = "Inclus des phrases typiques comme 'N\'hesitez pas si vous avez des questions !', 'Envoi rapide'."
    
    lang_lower = language.lower()
    if lang_lower == "nl":
        persona = "Tu es une vendeuse néerlandaise régulière et très sympathique sur Vinted (agissant sur le marché Pays-Bas/Belgique)."
        instructions_langue = "IMPORTANT : Rédige le titre et la description EXCLUSIVEMENT en Néerlandais fluide, naturel et moderne. N'utilise aucun mot français ou anglais."
        phrases_typiques = "Inclus des phrases typiques néerlandaises comme 'Stel gerust vragen als je die hebt!', 'Snelle verzending'."
    elif lang_lower == "lb":
        persona = "Tu es une vendeuse luxembourgeoise régulière et très humaine sur Vinted."
        instructions_langue = "IMPORTANT : Rédige le titre et la description EXCLUSIVEMENT en Luxembourgeois fluide, moderne et naturel."
        phrases_typiques = "Inclus des phrases typiques luxembourgeoises adaptées comme 'Zéckt net, wann der Froen hutt!', 'Schnell verschéckt'."
    elif lang_lower != "fr":
        # Fallback ou support futur (anglais, allemand, etc.)
        persona = f"Tu es une vendeuse régulière et très sympathique sur Vinted, native du marché ({language})."
        instructions_langue = f"IMPORTANT : Rédige le titre et la description EXCLUSIVEMENT dans la langue liée au code '{language}'."
        phrases_typiques = ""

    # Injection des variables dans le prompt — driven by niche definition when available,
    # sinon fallback sur les constantes hardcodees (retrocompat)
    from niche_loader import load_niche
    try:
        niche_def = load_niche(niche.lower())
        prompt_template = niche_def.analysis_prompt
        declared_vars = niche_def.analysis_prompt_variables
    except FileNotFoundError:
        # Niche inconnue : utiliser le prompt garment par defaut
        print(f"[Processor] [WARN] Niche '{niche}' introuvable — fallback sur le prompt garment.")
        prompt_template = PROMPT_ANALYSE
        declared_vars = ["PERSONA", "CONSIGNES_LANGUE", "PHRASES_TYPIQUES", "TAILLE_CIBLE"]

    # Construire le dict de substitution avec uniquement les variables declarees
    substitutions = {
        "PERSONA": persona,
        "CONSIGNES_LANGUE": instructions_langue,
        "PHRASES_TYPIQUES": phrases_typiques,
        "TAILLE_CIBLE": size,
    }
    format_kwargs = {k: v for k, v in substitutions.items() if k in declared_vars}
    final_prompt = prompt_template.format(**format_kwargs)

    try:
        from PIL import Image
        img = Image.open(image_path)
    except Exception as e:
        print(f"[Processor] ERREUR lecture image locale : {e}")
        return None

    try:
        client = genai.Client(api_key=api_key)
        
        response = client.models.generate_content(
            model='gemini-3.1-flash-lite',
            contents=[final_prompt, img],
        )
        raw_text = response.text

        if not raw_text:
            print("[Processor] ERREUR : reponse vide de l'API.")
            return None

        result = _parse_gemini_response(raw_text)
        if result:
            print(f"[Processor] Analyse reussie : '{result.get('titre_vinted', '?')}'")
        return result

    except Exception as e:
        print(f"[Processor] Erreur critique API Gemini : {e}")
        return None


if __name__ == "__main__":
    # Test rapide : python processor.py
    import sys
    if len(sys.argv) > 1:
        img_path = sys.argv[1]
        lang = sys.argv[2] if len(sys.argv) > 2 else "fr"
        result = analyze_screenshot(img_path, size="S", language=lang)
        if result:
            print("\n--- Resultat ---")
            print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        print("Usage : python processor.py <chemin_image> [langue: fr|nl|lb]")
