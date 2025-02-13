# Club Calendar Management System

Ce projet est une application de calendrier conçue spécifiquement pour les clubs d'aviation légère et d'ULM. Elle permet une gestion simple et efficace des réservations entre instructeurs et élèves, ainsi que des paiements et de la location d'avions.

## Version actuelle 1.3.1

**Version 1.3.x**
 *  Corréction de tous les bugs connue afin d'arrivé à une permière version stable et commercialisable 
  * Ajout feature d'inscription sans avion ainsi que la configuration des utilisateurs pour avoir acces a cette feature


**Version 1.2.x**
 *  ajout en plus de la version précédent les 6 classes ulm avec des restriction, autorisation et gestion en fonction de celle ci
 *  correction bug lors de la suppression d'un element avec AlertConfirmDeleted
 *  Suppression d'un user => supression de l'utilisateur dans le club mais pas de la DB
 *  Amélioration de la page calendar avec un nouveau design et une possibilité de gérer les évènements directement depuis le calendrier

**Version 1.1.x (old version since 06/01/2025)** 

Cette version est une version de développement et ne contient pas encore toutes les fonctionnalités prévues. Les fonctionnalités actuellement implémentées sont :

*   Authentification
*   création des user avec des roles différents
*   création / gestion / configuration d'un club
*   inscription / suppresssion a une sessions
*   Avions du club pour le choix dans une session de formation
*   Application responsive pour téléphone / tablette / ordinateur
*   possibilité de restreindre un utilisateurs

Les fonctionnalités listées dans la section "Fonctionnalités principales" ci-dessous sont prévues pour les versions ultérieures.

## Fonctionnalités principales (en développement)

- **Authentification** Rapiditée, confirmation mail, OAuth
- **Paiment** Ajouter la feature de paiment en utilisant stripe
- **Location** Ajouter la feature location des avions
- **React Native** Créer une application mobile avec react Native
- **Maintenance** Gérer correctement la maintenance des avions, si un avions passe en maintenance, gerer les élèves deja inscrit, ajouter une date de fin de maintenance
- **classe** Gérer la classes des avions (classe ULM)
- **Mail** Possibilité d'envoyer des email a tous les contact ou choix, chat dans le club 
- **Profile page** Finir la page profile en y ajoutant eds stats, et en la travaillant au niveau UI UX

## Technologies utilisées

- **Next.js** : Framework utilisé pour le développement de l'application.
- **ESlint** Controle du code
- **TypeScript** : Langage pour garantir la robustesse du code.
- **Supabase** : Utilisé pour la gestion des bases de données et l'authentification.
- **Tailwind CSS** : Framework CSS pour un design moderne et responsive.
- **ShadcnUI** : Bibliothèque pour des composants UI avancés et réutilisables.
- **Zod** Controlle des formulaire
- **Prisma** Interface avec la base de donnée
- **React icon & lucide react** Icon utiliser dans l'application
- **Authentification** Rapiditée, confirmation mail, OAuth
- **ReSend** Envoie des emails
- **React Email** Mise en page des emails
- **recharts** Graphiques

## Installation

1. Clonez ce dépôt :

```bash
git clone https://github.com/jpthibault20/aeroconnect.git
```	

2. Installez les dépendances :

```bash
npm install
```

3. Configurez les variables d'environnement :

créer les fichiers suivant : 

.env.local
```bash
WEBSITE_LINK=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```
.env
```bash
DATABASE_URL=""
DIRECT_URL=""
RESEND_API_KEY=""
```
Puis y ajouter vos element de connexions

4. Démarrez le serveur :

```bash
npm run dev
```

## TODO

Voici les tâches restantes à accomplir pour finaliser le projet :

- [ ] **Time Server** quand l'heure est utilisé dans le server envoyer au server via le clien le décalage horaire pour travailler toujours sur la meme heure

## Contribuer

La contribution externe n'est pour le moment pas acceptée. 

## License

Ce projet est sous licence MIT.

## Contact

Si vous avez des questions ou des commentaires, n'hésitez pas à me contacter via [mail](mailto:thibault@jp-developpement.com).

