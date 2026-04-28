# Ymmo - Projet B2 INFRA & DEV

Prototype full-stack en `HTML/CSS/JavaScript + Python + SQLite` pour une plateforme immobiliere centralisee.

## Fonctionnalites incluses

- catalogue de biens multi-agences
- filtres par ville, type, budget et statut
- inscription et connexion en JSON via Python
- demandes de contact stockees en base
- tableau de bord data (prix moyens, delais, villes chaudes, ventes recentes)
- reseau siege + 12 agences expose dans l'interface

## Architecture

- `app.py` : point d'entree du serveur HTTP Python
- `Backend/` : logique serveur, acces SQLite, securite, services
- `Pages/` : interface HTML/CSS/JS
- `Database/schema.sql` : structure SQLite
- `Database/seed.sql` : donnees de demo
- `Scripts/init_db.py` : initialisation de la base
- `Scripts/market_report.py` : rapport data en console

## Lancer le projet

1. Initialiser la base si besoin :

```powershell
python Scripts/init_db.py
```

2. Demarrer le serveur :

```powershell
python app.py
```

3. Ouvrir :

```text
http://127.0.0.1:8000
```

## Comptes de demonstration

- Agent : `alex.durand@ymmo.fr` / `YmmoAgent2026!`
- Manager : `lea.martin@ymmo.fr` / `YmmoManager2026!`
- Client : `client.demo@ymmo.fr` / `YmmoClient2026!`

## Notes

- Le mot de passe est hache en `PBKDF2 SHA-256`.
- Le serveur utilise uniquement la bibliotheque standard Python.
- Le rapport console peut etre lance avec :

```powershell
python Scripts/market_report.py
```
