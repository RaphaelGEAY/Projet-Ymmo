# Ymmo - Projet B2 INFRA & DEV

Prototype full-stack en `HTML/CSS/JavaScript + Python + SQLite` pour une plateforme immobiliere centralisee.
Infra réseau complète en `Windows Server`.

## Fonctionnalites incluses

- catalogue de biens multi-agences
- filtres par ville, type, budget et statut
- inscription et connexion en JSON via Python
- demandes de contact stockees en base
- tableau de bord data (prix moyens, delais, villes chaudes, ventes recentes)
- reseau siege + 12 agences expose dans l'interface

## Architecture du site

- `app.py` : point d'entree du serveur HTTP Python
- `Backend/` : logique serveur, acces SQLite, securite, services
- `Pages/` : interface HTML/CSS/JS
- `Database/schema.sql` : structure SQLite
- `Database/seed.sql` : donnees de demo
- `Scripts/init_db.py` : initialisation de la base
- `Scripts/market_report.py` : rapport data en console

## Infrastructure réseau

| Machine | Rôle / Services installés | Adresse IP |
| :--- | :--- | :--- |
| **SERV-CORE** | Contrôleur de Domaine (`LABO.LAN`), DNS, DHCP | `10.10.10.10` |
| **SERV-ADMIN** | Serveur Web (Application Ymmo), Git local | `10.10.10.11` |
| **ROUTEUR** | Routage Inter-VLAN / Service RRAS (Passerelle) | `10.10.10.2` & `10.10.20.2` |
| **CLIENT** | Poste Client (Windows 11 Pro) | Dynamique (DHCP) |

- **DNS** : Gestion de la zone `labo.lan`. Enregistrement A : `www.labo.lan` -> `10.10.10.11`.
- **DHCP** : Étendue sur le sous-réseau client `10.10.20.0/24` (Plage `.10` à `.100`). Passerelle : `.254` | DNS : `.10`.
- **GPOs** : Sécurité des mots de passe (12 car. min), raccourci bureau et gestion des dossiers.
- **Firewall** : Règle d'ouverture du port HTTP (80/8000) configurée en entrée sur SERV-ADMIN.

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
