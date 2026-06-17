# Ymmo - Projet B2 INFRA & DEV

Prototype full-stack en `HTML/CSS/JavaScript + Python + SQLite` pour une plateforme immobilière centralisée.  
Infrastructure réseau complète sous `Windows Server`.

## Fonctionnalités incluses

* catalogue de biens multi-agences
* filtres par ville, type, budget et statut
* inscription et connexion en JSON via Python
* demandes de contact stockées en base
* tableau de bord data (prix moyens, délais, villes chaudes, ventes récentes)
* réseau siège + 12 agences exposés dans l'interface

## Architecture du site

* `app.py` : point d'entrée du serveur HTTP Python
* `Backend/` : logique serveur, accès SQLite, sécurité, services
* `Pages/` : interface HTML/CSS/JS
* `Database/schema.sql` : structure SQLite
* `Database/seed.sql` : données de démo
* `Scripts/init_db.py` : initialisation de la base
* `Scripts/market_report.py` : rapport data en console

## Infrastructure réseau

| Machine        | Rôle / Services installés                      | Adresse IP                  |
| :------------- | :--------------------------------------------- | :-------------------------- |
| **SERV-CORE**  | Contrôleur de domaine (`LABO.LAN`), DNS, DHCP  | `10.10.10.10`               |
| **SERV-ADMIN** | Serveur Web (application Ymmo), Git local      | `10.10.10.11`               |
| **ROUTEUR**    | Routage inter-VLAN / Service RRAS (passerelle) | `10.10.10.2` & `10.10.20.2` |
| **CLIENT**     | Poste client (Windows 11 Pro)                  | Dynamique (DHCP)            |

* **DNS** : gestion de la zone `labo.lan`. Enregistrement A : `www.labo.lan` → `10.10.10.11`.
* **DHCP** : étendue sur le sous-réseau client `10.10.20.0/24` (plage `.10` à `.100`). Passerelle : `.254` | DNS : `.10`.
* **GPOs** : sécurité des mots de passe (12 caractères minimum), raccourci bureau et gestion des dossiers.
* **Firewall** : règle d'ouverture du port HTTP (80/8000) configurée en entrée sur SERV-ADMIN.

## Lancer le projet

1. Initialiser la base si besoin :

```powershell
python Scripts/init_db.py
```

2. Démarrer le serveur :

```powershell
python app.py
```

3. Ouvrir :

```text
http://127.0.0.1:8000
```

## Comptes de démonstration

* Agent : `alex.durand@ymmo.fr` / `YmmoAgent2026!`
* Manager : `lea.martin@ymmo.fr` / `YmmoManager2026!`
* Client : `client.demo@ymmo.fr` / `YmmoClient2026!`
