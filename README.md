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

## 🛠️ Prérequis et Dépendances Système

Pour faire tourner le projet localement (notamment sur **WSL2 / Ubuntu / Linux**), installez les dépendances suivantes :

### 1. Dépendances Système (Linux / WSL2) :
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
- **pnpm :** `npm install -g pnpm`
- **Python :** Version 3.10+ avec `venv` et `pip`
- **SQLite3 :** Installé par défaut

---

## 📦 Installation et Configuration initiale

### Étape 1 : Cloner et installer les paquets globaux
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
cd ../..
```

### Étape 3 : Configurer le Frontend (Next.js)
```bash
cd apps/web
pnpm install
cd ../..
```

### Étape 4 : Configurer le Bridge WhatsApp
```bash
cd scripts/bridge
npm install
cd ../..
```

---

## 🖥️ Démarrage Quotidien (3 Terminaux)

### 🔲 Terminal 1 : Backend (FastAPI)
```bash
cd ~/wasla/apps/api
source venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
> API : `http://localhost:8000` | Swagger : `http://localhost:8000/docs`

### 🔲 Terminal 2 : Frontend (Next.js)
```bash
cd ~/wasla/apps/web
pnpm dev
```
> Interface : `http://localhost:3000`

### 🔲 Terminal 3 : Bridge WhatsApp
```bash
cd ~/wasla/scripts/bridge
node index.js
```
> **Note :** Au premier lancement, scannez le **QR Code** affiché dans le terminal avec WhatsApp (Appareils connectés). Session sauvegardée dans `~/wasla/scripts/bridge/.session/`.

---

## 🔒 Sécurité et Fichiers Locaux

- **Base de données :** `~/wasla/apps/api/wasla.db`
- **Session WhatsApp :** `~/wasla/scripts/bridge/.session`
- **Heartbeat :** `~/wasla/.bridge-heartbeat.json`
- ⚠️ Ajoutez `.session` et `wasla.db` dans `.gitignore`

---

## 📄 Licence & Crédits

Projet conçu et réalisé par **Mohamad Errachdi** avec le support de l'Intelligence Artificielle.  
*Libre d'utilisation et d'adaptation pour vos besoins professionnels locaux !*
