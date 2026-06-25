@echo off
REM ============================================================================
REM  launch_brave_cdp.bat
REM  Relance Brave avec le port de debug CDP 9220 et ouvre les 5 profils sur Vinted.
REM  Necessaire pour que salve.py / publier_tous.py puissent piloter les onglets.
REM
REM  ATTENTION : ce script FERME d'abord toutes les fenetres Brave existantes
REM  (impossible d'ajouter le flag CDP a une instance Brave deja lancee).
REM
REM  A lancer manuellement, ou au demarrage de la machine (pour le cron).
REM  Profils : emma=Profile 1, Yazz=Profile 2, nina=Profile 4, lena=Profile 5, orane=Profile 6
REM ============================================================================

set BRAVE="C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe"

echo [1/3] Fermeture de toutes les fenetres Brave...
taskkill /F /IM brave.exe /T >nul 2>&1
timeout /t 3 /nobreak >nul

echo [2/3] Lancement de l'instance CDP 9220 (emma / Profile 1)...
start "" %BRAVE% --remote-debugging-port=9220 --profile-directory="Profile 1" "https://www.vinted.fr"
timeout /t 5 /nobreak >nul

echo [3/3] Ouverture des autres profils dans la meme instance...
start "" %BRAVE% --profile-directory="Profile 2" "https://www.vinted.fr"
timeout /t 2 /nobreak >nul
start "" %BRAVE% --profile-directory="Profile 4" "https://www.vinted.fr"
timeout /t 2 /nobreak >nul
start "" %BRAVE% --profile-directory="Profile 5" "https://www.vinted.fr"
timeout /t 2 /nobreak >nul
start "" %BRAVE% --profile-directory="Profile 6" "https://www.vinted.fr"

echo.
echo ============================================================================
echo  Brave relance avec CDP 9220 + 5 profils sur Vinted.
echo  VERIFIE que chaque fenetre est bien CONNECTEE a Vinted (sinon connecte-toi).
echo  Puis relance la salve.
echo ============================================================================
