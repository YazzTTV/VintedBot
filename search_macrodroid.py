import os

base_dir = r"d:\AntiGravity\02 Projects\Business Vinted"
for root, dirs, files in os.walk(base_dir):
    for f in files:
        if f.endswith(('.md', '.py', '.txt', '.json')):
            path = os.path.join(root, f)
            try:
                with open(path, 'r', encoding='utf-8', errors='ignore') as file:
                    content = file.read()
                    if 'macrodroid' in content.lower():
                        print(f"Found in {path}")
            except Exception:
                pass
