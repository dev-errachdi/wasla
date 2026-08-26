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
│   ├── api/               # API Backend (FastAPI + SQLAlchemy)
│   └── worker/            # Tâches d'arrière-plan (futur)
├── scripts/
│   └── bridge/            # Pont WhatsApp (whatsapp-web.js + SQLite)
├── docs/                  # Documentation du projet
├── packages/              # Packages partagés
└── package.json           # Gestion du Monorepo via pnpm
