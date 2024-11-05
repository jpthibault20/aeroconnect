# AeroConnect

## todo
- page calendar: affichage popup session calendrier
- page calendar: logique reservation
- page flights: modifier une session
- page planes: modifier un avion
- page planes: supprimer un avion
- page planes: switch état avion
- page students: logique utilisateur restreint
- page students: modifier un user
- page students: supprimer un user
- page profile: enregistrement des modifications
- page profile: modification du mot de passe


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