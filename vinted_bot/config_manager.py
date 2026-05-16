import os
import json

BASE_DIR = r"D:\AntiGravity\02 Projects\Business Vinted"
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
        self.history_path = os.path.join(self.account_dir, "Sourcing_History.md")
        
        # Chargement d'éventuelles propriétés customisées depuis settings.json
        self.settings_path = os.path.join(self.account_dir, "settings.json")
        self.size = "S" # Par défaut
        self.language = "fr" # Par défaut ("fr", "nl", etc.)
        self.prompt_style = "" # Custom prompt tweaks
        
        self._load_settings()

    def _load_settings(self):
        if os.path.exists(self.settings_path):
            try:
                with open(self.settings_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.size = data.get("size", self.size)
                    self.language = data.get("language", self.language)
                    self.prompt_style = data.get("prompt_style", self.prompt_style)
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
            
        # Initialiser settings.json si manquant
        if not os.path.exists(self.settings_path):
            with open(self.settings_path, 'w', encoding='utf-8') as f:
                json.dump({"size": self.size, "language": self.language, "prompt_style": self.prompt_style}, f, indent=2)
        else:
            # S'assurer que les nouveaux champs par défaut sont injectés dans les fichiers existants
            try:
                with open(self.settings_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                updated = False
                if "language" not in data:
                    data["language"] = self.language
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
    """Liste tous les comptes disponibles dans le dossier Accounts."""
    if not os.path.exists(ACCOUNTS_ROOT):
        return []
    return [d for d in os.listdir(ACCOUNTS_ROOT) if os.path.isdir(os.path.join(ACCOUNTS_ROOT, d))]
