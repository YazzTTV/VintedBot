import os
import re
import pandas as pd

def clean_text(text):
    if not text:
        return ""
    text = text.strip()
    # Remove markdown bold **
    text = text.replace("**", "")
    return text

def extract_url(text):
    # Match [Text](URL)
    match = re.search(r'\[.*?\]\((https?://.*?)\)', text)
    if match:
        return match.group(1)
    # Handle simple URL
    match = re.search(r'(https?://[^\s\]]+)', text)
    if match:
        return match.group(1)
    return text.strip()

def extract_fiche(text):
    # Match [[Fiche]]
    match = re.search(r'\[\[(.*?)\]\]', text)
    if match:
        return match.group(1)
    return text.strip()

def parse_md_file(filepath):
    if not os.path.exists(filepath):
        return pd.DataFrame()
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    lines = content.split('\n')
    data = []
    for line in lines:
        line = line.strip()
        if line.startswith('|') and not ':---' in line and 'Statut' not in line:
            # It's a data row
            cells = [c.strip() for c in line.split('|')]
            # Split will result in empty first and last if it starts/ends with |
            cells = [c for c in cells if c]
            
            if len(cells) >= 5:
                statut = clean_text(cells[0])
                date = clean_text(cells[1])
                article = clean_text(cells[2])
                shein_raw = cells[3]
                fiche_raw = cells[4]
                
                url = extract_url(shein_raw)
                fiche = extract_fiche(fiche_raw)
                
                data.append({
                    "Statut": statut,
                    "Date de Sourcing": date,
                    "Article": article,
                    "Lien Shein": url,
                    "Fiche Annonce": fiche
                })
    return pd.DataFrame(data)

def main():
    base_dir = r"D:\AntiGravity\02 Projects\Business Vinted\Accounts"
    accounts = ["nina", "margaux", "lena"]
    
    output_file = r"D:\AntiGravity\02 Projects\Business Vinted\Sourcing_History_Export.xlsx"
    
    with pd.ExcelWriter(output_file, engine='openpyxl') as writer:
        for account in accounts:
            file_path = os.path.join(base_dir, account, "Sourcing_History.md")
            df = parse_md_file(file_path)
            
            if not df.empty:
                df.to_excel(writer, sheet_name=account.capitalize(), index=False)
                # Auto-adjust columns would be nice but optional
                worksheet = writer.sheets[account.capitalize()]
                for i, col in enumerate(df.columns):
                    # Set col width
                    worksheet.column_dimensions[chr(65 + i)].width = 25
    
    print(f"Export complete: {output_file}")

if __name__ == "__main__":
    main()
