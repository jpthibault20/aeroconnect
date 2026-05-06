# ✈️ Club Calendar Management System

**La solution complète de gestion pour aéroclubs et clubs d'ULM.**

Ce projet est une application web moderne conçue pour simplifier le quotidien des clubs d'aviation légère. Elle centralise la gestion des réservations (instructeurs et élèves), le suivi de la flotte, ainsi que l'administration des membres et des paiements.

---

## 🚀 Fonctionnalités Actuelles

L'application est actuellement stable et offre les fonctionnalités clés suivantes :

### 📅 Gestion & Planning
* **Calendrier interactif :** Vue moderne pour gérer les événements et réservations.
* **Réservations :** Système de créneaux entre instructeurs et élèves.
* **Gestion des sessions :** Inscription et suppression simplifiées aux sessions de vol.
* **Flotte :** Sélection des avions disponibles lors des réservations.

### 👥 Administration & Membres
* **Gestion des utilisateurs :** Création de profils avec rôles multiples (Admin, Instructeur, Élève).
* **Configuration du Club :** Paramétrage complet de l'entité.
* **Classes ULM (v1.2+) :** Gestion des 6 classes ULM avec restrictions et autorisations spécifiques.
* **Suppression douce (Soft Delete) :** Désactivation des utilisateurs sans perte d'historique en base de données.
* **Restriction :** Possibilité de restreindre l'accès à certains utilisateurs.

### 💻 Expérience Utilisateur
* **Design Responsive :** Interface optimisée pour Mobile, Tablette et Desktop.
* **Authentification :** Connexion sécurisée.
* **Feature STEX :** (Intégrée en v1.4).

---

## 🛠 Stack Technique

Ce projet repose sur une architecture robuste et typée :

| Catégorie | Technologies |
| :--- | :--- |
| **Framework & Core** | ![Next.js](https://img.shields.io/badge/Next.js-black?style=flat-square&logo=next.js) ![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript) |
| **Backend & DB** | ![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase) ![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=flat-square&logo=prisma) |
| **UI & Design** | ![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat-square&logo=tailwind-css) **ShadcnUI** |
| **Sécurité & Qualité** | **Zod** (Validation), **ESLint** (Linter), **Auth** (OAuth/Mail) |
| **Communication** | **ReSend** (API Mail), **React Email** (Templates) |
| **Divers** | **Recharts** (Graphiques), **Lucide React** (Icônes) |

---

## 🔮 Roadmap & Fonctionnalités en développement

Voici les axes de développement prioritaires pour les prochaines versions :

- [ ] **Paiements :** Intégration complète de **Stripe** pour les règlements en ligne.
- [ ] **Location :** Module de location d'avions (hors instruction).
- [ ] **Maintenance Avancée :** Gestion des arrêts techniques (V.N.A), impact automatique sur les réservations existantes et dates de fin de maintenance.
- [ ] **Communication :** Système de chat interne au club et mailing ciblé ou groupé.
- [ ] **Profil Avancé :** Statistiques de vol détaillées et refonte UI/UX de la page profil.
- [ ] **Application Mobile :** Portage d'une version mobile via **React Native**.
- [ ] **Synchronisation Horaire :** Gestion unifiée du Time Server (Client/Server offset).

---

## 📜 Historique des Versions (Changelog)

### **Version 2.0.x (Actuelle)**
* ✨ **Refonte totale :** Nouveau design global de l'application (UI/UX).
* 🐛 **Fix :** Correction de bugs mineurs.

### **Version 1.4.x**
* 🚀 **New :** Ajout de la fonctionnalité STEX.
* 👀 **UI :** Ajout de la vue de version.
* 🐛 **Fix :** Corrections diverses.

### **Version 1.3.x (Release Commerciale)**
* ✅ **Stable :** Correction de tous les bugs connus pour la première version commercialisable.
* 🚀 **New :** Feature d'inscription "sans avion" et configuration utilisateur associée.

### **Version 1.2.x**
* ✈️ **New :** Gestion des 6 classes ULM (restrictions/autorisations).
* 🗑️ **Data :** Implémentation du *Soft Delete* pour les utilisateurs.
* 📅 **Calendar :** Amélioration UX et gestion des événements directement depuis le calendrier.
* 🛡️ **UX :** Ajout des `AlertConfirmDeleted` pour sécuriser les suppressions.

### **Version 1.1.x (Legacy - 01/2025)**
* Version de développement initiale (Authentification, Création Club/User, Sessions basiques).

---

## 🤝 Contribuer

Ce projet est actuellement développé en interne. Les contributions externes ne sont pas acceptées pour le moment.

## 📄 Licence

Ce projet est distribué sous la licence **MIT**.

## 📞 Contact

Pour toute question, demande de démonstration ou retour technique, n'hésitez pas à me contacter :

📧 **Thibault JEANPIERRE** – [thibault@jp-developpement.com](mailto:thibault@jp-developpement.com)