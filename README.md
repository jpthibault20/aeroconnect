# AeroConnect

## todo VERSION 1.0
    - page calendar: 
        UI/UX popup affichage session
        litle update for instructor create this session or admin or owner (REMOVE, remove student, ...)
        logisue book session: 
            user have minimal autorisation for tyis action
            student student available for this time session 
            plane student selected isn't book per another student 
        autorisation : 
            full acces : ADMIN / OWNER / INSTRUCTOR
            student acces: STUDENT (see and book session)
            another role: can just see session 

    - page session flight:
        add pilote col for all access
        ADMIN: can see all session, can choice club 
        OWNER: can see all session of your club and modify it
        INSTRUCTOR: can see all session of your club and modify it if is your session
        STUDENT: can see all session of your club

    - mail for: 
        user book session 
        user free session
        session deleted
        
    - check up:
        control for foms 
        delete user => delete auth user
        login (tim for register, confrim page,


- mail
- Controle Formulaire Modification user
- delet userb => delet user in auth table
- check création d'un nouvezu compte
- 

## todo VERSION 2.0
    - sessions: stockage dans un usememo
    - sessions: fetch sessions sur 2 mois puis plus si changement de la date s'affichage
    - club: page config club
    - club: inscription : demande de code club => validation par le club en question
    - all pages: fetch data en arrière plan

## todo VERSION 3.0
    - add méthode de paiement
    - add méthode de facturation

## Fonctionnalités

- **Gestion des vols**: Permet aux élèves de gérer leurs vols, de voir les vols disponibles et les vols réservés, et de gérer leur profil.
- **Gestion des avions**: Permet aux élèves de gérer leurs avions, de voir les avions disponibles et les avions réservés, et de gérer leur profil.
- **Gestion des élèves**: Permet aux élèves de gérer leurs élèves, de voir les élèves disponibles et les élèves réservés, et de gérer leur profil.
- **Gestion du profil**: Permet aux élèves de gérer leur profil, de voir leur profil, et de modifier leur profil.

## Installation

### Pré-requis

- [Node.js](https://nodejs.org/en/) (version 16.x ou supérieure)
- [Prisma](https://www.prisma.io/docs/guides/database/install-prisma-manually/install-prisma-manually)

### Installation

1. Clonez le dépôt GitHub:

```bash
git clone https://github.com/tjean/aeroconnect.git
```

2. Entrez dans le dossier du projet:

```bash
cd aeroconnect
```

3. Installez les dépendances:

```bash
npm install
```

4. Créez une base de données PostgreSQL:

```bash
npx prisma db push
```

5. Démarrez le serveur de développement:

```bash
npm run dev
```

## Utilisation

Pour utiliser AeroConnect, vous devez vous connecter au club de l'école de l'air et de l'espace de l'aéronautique de l'Université de Sherbrooke. Vous pouvez vous connecter en utilisant votre adresse e-mail et votre mot de passe.

Une fois connecté, vous pouvez accéder à différents onglets pour gérer vos vols, vos avions, vos élèves, et votre profil.

## Contribuer

Si vous souhaitez contribuer à AeroConnect, veuillez suivre les étapes suivantes:

1. Clonez le dépôt GitHub:

```bash
git clone https://github.com/tjean/aeroconnect.git
```

2. Entrez dans le dossier du projet:

```bash
cd aeroconnect
```

3. Installez les dépendances:

```bash
npm install
```

4. Créez une base de données PostgreSQL:

```bash
npx prisma db push
```

5. Démarrez le serveur de développement:

```bash
npm run dev
```

6. Créez une branche pour votre travail et effectuez vos modifications.

7. Envoyez une demande de tirage (pull request) pour fusionner vos modifications avec la branche principale.

8. Une fois que votre demande de tirage est approuvée, il sera fusionnée avec la branche principale et sera disponible dans la version publique de AeroConnect.

## Licence

AeroConnect est sous licence MIT. Vous pouvez trouver la licence dans le fichier LICENSE.