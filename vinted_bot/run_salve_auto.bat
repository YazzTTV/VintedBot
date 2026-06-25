@echo off
REM ============================================================================
REM  run_salve_auto.bat — Lance UNE salve d'automatisation (pour tache planifiee).
REM  Comptes par defaut = nina/lena/orane (yazz/emma sortis). 3 winners + 2 fakes = 5/profil.
REM  PREREQUIS : Brave doit deja tourner avec CDP 9220 (launch_brave_cdp.bat).
REM  Logue dans salve_auto.log a cote du script.
REM ============================================================================
cd /d "C:\Users\Administrateur\Desktop\VintedBot-main\vinted_bot"
"C:\Users\Administrateur\Desktop\VintedBot-main\.venv\Scripts\python.exe" -u salve.py --submit --winners 3 --fakes 2 >> "%~dp0salve_auto.log" 2>&1
