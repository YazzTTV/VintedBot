import os
import json

# niche_loader est dans le meme dossier — import tardif pour eviter les imports circulaires
# (utilise la property niche_def ci-dessous)

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ACCOUNTS_ROOT = os.path.join(BASE_DIR, "Accounts")
BOT_DIR = os.path.join(BASE_DIR, "vinted_bot")

class AccountConfig:
    def __init__(self, account_name: str):
        self.name = account_name
        self.account_dir = os.path.join(ACCOUNTS_ROOT, account_name)
        
        # Sous-dossiers spécifiques
        self.input_dir = os.path.join(self.account_dir, "Input_Screenshots")
        self.output_dir = os.path.join(self.account_dir, "Output_Listings")
        self.archive_dir = os.path.join(self.account_dir, "Products_Archive")
        
        # Fichiers de données spécifiques
        self.avatar_path = os.path.join(self.account_dir, "avatar.jpg")
        self.floor_template_path = os.path.join(self.account_dir, "floor_template.jpg")
        self.hanger_template_path = os.path.join(self.account_dir, "hanger_template.jpg")
        self.hanger_templates_dir = os.path.join(self.account_dir, "Hanger_Templates")
        self.history_path = os.path.join(self.account_dir, "Sourcing_History.md")
        
        # Chargement d'éventuelles propriétés customisées depuis settings.json
        self.settings_path = os.path.join(self.account_dir, "settings.json")
        self.size = "S" # Par défaut
        self.language = "fr" # Par défaut ("fr", "nl", etc.)
        self.prompt_style = "" # Custom prompt tweaks
        self.niche = "garment" # Par défaut ("garment", "stroller", etc.)
        self.brave_profile = "Default" # Par défaut (ex: "Default", "Profile 1")
        self.cdp_port = 9222 # Port par défaut pour CDP
        
        self._load_settings()
        self._niche_def = None  # Chargement paresseux via la property niche_def

    @property
    def niche_def(self):
        """
        Retourne la NicheDefinition correspondant a self.niche.
        Chargement paresseux : la definition est lue une seule fois et mise en cache.
        """
        if self._niche_def is None:
            from niche_loader import load_niche
            self._niche_def = load_niche(self.niche)
        return self._niche_def

    def _load_settings(self):
        if os.path.exists(self.settings_path):
            try:
                with open(self.settings_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.size = data.get("size", self.size)
                    self.language = data.get("language", self.language)
                    self.prompt_style = data.get("prompt_style", self.prompt_style)
                    self.niche = data.get("niche", self.niche)
                    self.brave_profile = data.get("brave_profile", self.brave_profile)
                    self.cdp_port = data.get("cdp_port", self.cdp_port)
            except Exception:
                pass
 
    def ensure_dirs(self):
        """Crée l'arborescence pour ce compte si elle n'existe pas."""
        os.makedirs(self.input_dir, exist_ok=True)
        os.makedirs(self.output_dir, exist_ok=True)
        os.makedirs(self.archive_dir, exist_ok=True)
        
        # Si l'avatar n'existe pas encore, copier celui par défaut du bot pour initialiser
        default_avatar = os.path.join(BOT_DIR, "avatar.jpg")
        if not os.path.exists(self.avatar_path) and os.path.exists(default_avatar):
            import shutil
            shutil.copy2(default_avatar, self.avatar_path)
            
        # Pareil pour floor template
        default_floor = os.path.join(BOT_DIR, "floor_template.jpg")
        if not os.path.exists(self.floor_template_path) and os.path.exists(default_floor):
            import shutil
            shutil.copy2(default_floor, self.floor_template_path)
            
        default_hanger = os.path.join(BOT_DIR, "hanger_template.jpg")
        if not os.path.exists(self.hanger_template_path) and os.path.exists(default_hanger):
            import shutil
            shutil.copy2(default_hanger, self.hanger_template_path)
            
        # Initialiser le dossier des modèles de cintres multiples
        os.makedirs(self.hanger_templates_dir, exist_ok=True)
        global_hanger_dir = os.path.join(BOT_DIR, "Hanger_Templates")
        if os.path.exists(global_hanger_dir):
            for file in os.listdir(global_hanger_dir):
                src = os.path.join(global_hanger_dir, file)
                dst = os.path.join(self.hanger_templates_dir, file)
                if not os.path.exists(dst) and os.path.isfile(src):
                    import shutil
                    shutil.copy2(src, dst)
            
        # Initialiser settings.json si manquant
        if not os.path.exists(self.settings_path):
            with open(self.settings_path, 'w', encoding='utf-8') as f:
                json.dump({
                    "size": self.size, 
                    "language": self.language, 
                    "prompt_style": self.prompt_style, 
                    "niche": self.niche,
                    "brave_profile": self.brave_profile,
                    "cdp_port": self.cdp_port
                }, f, indent=2)
        else:
            # S'assurer que les nouveaux champs par défaut sont injectés dans les fichiers existants
            try:
                with open(self.settings_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                updated = False
                if "language" not in data:
                    data["language"] = self.language
                    updated = True
                if "niche" not in data:
                    data["niche"] = self.niche
                    updated = True
                if "brave_profile" not in data:
                    data["brave_profile"] = self.brave_profile
                    updated = True
                if "cdp_port" not in data:
                    data["cdp_port"] = self.cdp_port
                    updated = True
                
                if updated:
                    with open(self.settings_path, 'w', encoding='utf-8') as f:
                        json.dump(data, f, indent=2)
            except Exception:
                pass

def get_account_config(account_name: str = "nina") -> AccountConfig:
    """
    Instancie et garantit l'existence des répertoires du compte.
    """
    config = AccountConfig(account_name)
    config.ensure_dirs()
    return config

def list_available_accounts():
    """Liste tous les comptes disponibles dans le dossier Accounts (en excluant les comptes inactifs locaux)."""
    if not os.path.exists(ACCOUNTS_ROOT):
        return []
    
    # Comptes inactifs sur ce PC
    ignored_accounts = {"emma", "margaux", "ninapython"}
    
    return [
        d for d in os.listdir(ACCOUNTS_ROOT) 
        if os.path.isdir(os.path.join(ACCOUNTS_ROOT, d)) and d.lower() not in ignored_accounts
    ]
