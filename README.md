```markdown
# 💬 WASLA | وصلة

<p align="center">
  <strong>Un système Full-Stack entièrement local (Local-Only) pour gérer les conversations WhatsApp d'entreprise sans l'API Cloud de Meta.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Auteur-Mohamad_Errachdi-blue?style=flat-square" alt="Auteur" />
  <img src="https://img.shields.io/badge/Développé_avec-Intelligence_Artificielle_(AI)-8A2BE2?style=flat-square" alt="AI Assisted" />
  <img src="https://img.shields.io/badge/Statut-Prêt_à_l'emploi-success?style=flat-square" alt="Status" />
  <img src="https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/FastAPI-0.100+-009688?style=flat-square&logo=fastapi" alt="FastAPI" />
  <img src="https://img.shields.io/badge/SQLite-Local_DB-003B57?style=flat-square&logo=sqlite" alt="SQLite" />
</p>

---

> 👨‍💻 **Auteur :** Mohamad Errachdi  
> 🤖 **Développement :** Projet Full-Stack (Frontend, Backend, WhatsApp Bridge) conçu et codé **de zéro (0) à 100% avec l'aide de l'Intelligence Artificielle (AI)**.  
> ⚠️ **Note de maintenance :** Le projet est **complet, fonctionnel et prêt à l'emploi**. Toutefois, les mises à jour régulières et le développement de nouvelles fonctionnalités sont actuellement suspendus en raison des capacités limitées de ma machine de développement (PC faible en ressources).

---

## 📌 À propos du projet (About Wasla)

**Wasla (وصلة)** est une solution open-source et locale conçue pour permettre aux entreprises et aux équipes de support/vente de gérer leurs discussions WhatsApp, d'assigner des conversations aux agents et de répondre aux clients depuis une interface unique et fluide. 

Le projet élimine le besoin d'utiliser l'API Business de Meta, réduisant ainsi les coûts à zéro et garantissant qu'aucune donnée client n'est hébergée sur un cloud tiers (Cloud-free).

### ⚙️ Comment ça marche ?
1. **WhatsApp Bridge (Node.js) :** Se connecte à WhatsApp Web via une session locale sécurisée, écoute les messages entrants et les enregistre directement dans une base de données SQLite locale.
2. **Backend API (FastAPI) :** Gère la logique métier, l'authentification des utilisateurs et la synchronisation des messages.
3. **Frontend Dashboard (Next.js) :** Une interface utilisateur moderne et rapide permettant de consulter les conversations, d'envoyer des réponses et d'assigner des tickets.

---

## 🏗️ Architecture du Projet

```text
wasla/
├── apps/
│   ├── web/               # Interface utilisateur (Next.js 16 + Tailwind CSS)
│   ├── api/               # API Backend (FastAPI + SQLite)
│   └── worker/            # Tâches d'arrière-plan (futur)
├── scripts/
│   └── bridge/            # Pont WhatsApp (whatsapp-web.js + better-sqlite3)
├── docs/                  # Documentation du projet
├── packages/              # Packages partagés
└── package.json           # Gestion du Monorepo via pnpm
```

---

## 🛠️ Prérequis et Dépendances Système (Ce dont le projet a besoin)

Pour faire tourner le projet localement (notamment sur **WSL2 / Ubuntu / Linux**), vous devez installer les dépendances système suivantes pour que Puppeteer (utilisé par le Bridge) fonctionne sans erreurs :

### 1. Dépendances Système requises (Linux / WSL2) :
Exécutez cette commande dans votre terminal pour installer toutes les bibliothèques nécessaires au bon fonctionnement du navigateur Chromium :
```bash
sudo apt update && sudo apt install -y \
  libgbm-dev \
  libnss3 \
  libatk-bridge2.0-0 \
  libgtk-3-0 \
  libasound2 \
  libxss1 \
  libxtst6 \
  libxshmfence1 \
  libdrm2
```

### 2. Environnements de développement requis :
- **Node.js :** Version 18 ou 20+
- **pnpm :** Gestionnaire de paquets global (`npm install -g pnpm`)
- **Python :** Version 3.10+ avec `venv` et `pip`
- **SQLite3 :** Installé par défaut sur la plupart des systèmes

---

## 📦 Installation et Configuration initiale

### Étape 1 : Cloner le projet et installer les paquets globaux
```bash
cd wasla
pnpm install
```

### Étape 2 : Configurer le Backend (FastAPI)
```bash
cd apps/api
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
# La base de données 'wasla.db' sera générée automatiquement lors du premier démarrage.
cd ../..
```

### Étape 3 : Configurer l'interface Frontend (Next.js)
```bash
cd apps/web
pnpm install
cd ../..
```

### Étape 4 : Configurer le WhatsApp Bridge (Node.js)
```bash
cd scripts/bridge
npm install
cd ../..
```

---

## 🖥️ Démarrage Quotidien (Running the Project)

Pour démarrer l'application complète, vous devez ouvrir **3 terminaux distincts** :

### 🔲 Terminal 1 : Le Backend (FastAPI)
```bash
cd ~/wasla/apps/api
source venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
* **Lien de l'API :** `http://localhost:8000`
* **Lien Swagger (Doc API) :** `http://localhost:8000/docs`

---

### 🔲 Terminal 2 : L'interface Web (Next.js)
```bash
cd ~/wasla/apps/web
pnpm dev
```
* **Lien de l'application :** `http://localhost:3000`

---

### 🔲 Terminal 3 : Le Bridge WhatsApp (Node.js)
```bash
cd ~/wasla/scripts/bridge
node index.js
```
> **Note Importante :** Au premier lancement, scannez le **QR Code** qui s'affiche dans ce terminal avec l'application WhatsApp de votre téléphone (Appareils connectés). La session sera enregistrée localement dans le dossier `~/wasla/scripts/bridge/.session/`.

---

## 🔒 Sécurité et Fichiers Locaux générés

Voici les fichiers importants créés localement qu'il faut garder sécurisés (déjà ignorés dans `.gitignore`) :
- **Base de données :** `~/wasla/apps/api/wasla.db`
- **Session WhatsApp :** `~/wasla/scripts/bridge/.session`
- **Fichier d'état (Heartbeat) :** `~/wasla/.bridge-heartbeat.json`

---

## 📄 Licence & Crédits

Projet conçu et réalisé avec succès par **Mohamad Errachdi** avec le support complet de l'Intelligence Artificielle.  
*Libre d'utilisation et d'adaptation pour vos besoins professionnels locaux !*
```
