import psycopg2
import os
from env import DATABASE_URL


def get_all_clubs(cursor):
    """Récupère tous les noms de clubs de la table Club"""
    try:
        cursor.execute('SELECT id, "Name" FROM public."Club" ORDER BY "Name";')
        clubs = cursor.fetchall()
        return clubs
    except Exception as e:
        print(f"Erreur lors de la récupération des clubs: {e}")
        return []

def get_users_by_club(cursor, club_id):
    """Récupère les informations des utilisateurs d'un club spécifique"""
    try:
        query = """
        SELECT email, "firstName", "lastName", role
        FROM public."User" 
        WHERE "clubID" = %s
        ORDER BY "lastName", "firstName";
        """
        cursor.execute(query, (club_id,))
        users = cursor.fetchall()
        return users
    except Exception as e:
        print(f"Erreur lors de la récupération des utilisateurs: {e}")
        return []

def get_all_users(cursor):
    """Récupère les informations de tous les utilisateurs avec leur club associé"""
    try:
        query = """
        SELECT u.email, u."firstName", u."lastName", u.role, c."Name" as club_name
        FROM public."User" u
        LEFT JOIN public."Club" c ON u."clubID" = c.id
        ORDER BY c."Name", u."lastName", u."firstName";
        """
        cursor.execute(query)
        users = cursor.fetchall()
        return users
    except Exception as e:
        print(f"Erreur lors de la récupération de tous les utilisateurs: {e}")
        return []

def export_to_csv(data, filename, headers):
    """Exporte les données vers un fichier CSV"""
    import csv
    
    try:
        with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.writer(csvfile)
            writer.writerow(headers)
            writer.writerows(data)
        print(f"Données exportées avec succès dans {filename}")
    except Exception as e:
        print(f"Erreur lors de l'exportation des données: {e}")

def main():
    try:
        # Connexion à la base de données
        connection = psycopg2.connect(DATABASE_URL)
        print("Connexion réussie!")
        
        # Création d'un curseur pour exécuter des requêtes SQL
        cursor = connection.cursor()
        
        # Vérification de la connexion
        cursor.execute("SELECT NOW();")
        result = cursor.fetchone()
        print("Heure actuelle:", result)
        
        # Récupération de tous les clubs
        clubs = get_all_clubs(cursor)
        
        if not clubs:
            print("Aucun club trouvé dans la base de données.")
            cursor.close()
            connection.close()
            return
        
        # Affichage des clubs disponibles
        print("\nListe des clubs disponibles:")
        for i, (club_id, club_name) in enumerate(clubs, 1):
            print(f"{i}. {club_name}")
        print(f"{len(clubs) + 1}. Tous les clubs")
        
        # Demande à l'utilisateur de choisir un club
        while True:
            try:
                choice = int(input("\nChoisissez un club (entrez le numéro): "))
                if 1 <= choice <= len(clubs) + 1:
                    break
                else:
                    print(f"Veuillez entrer un numéro entre 1 et {len(clubs) + 1}")
            except ValueError:
                print("Veuillez entrer un numéro valide")
        
        # Récupération des utilisateurs selon le choix
        if choice <= len(clubs):
            # Club spécifique choisi
            selected_club_id, selected_club_name = clubs[choice - 1]
            users = get_users_by_club(cursor, selected_club_id)
            
            if users:
                print(f"\nUtilisateurs du club '{selected_club_name}':")
                for email, first_name, last_name, role in users:
                    print(f"{last_name} {first_name} - {email} - Rôle: {role}")
                
                # Exportation vers CSV
                csv_filename = f"users_{selected_club_name.replace(' ', '_')}.csv"
                export_to_csv(users, csv_filename, ["Email", "Prénom", "Nom", "Rôle"])
            else:
                print(f"Aucun utilisateur trouvé pour le club '{selected_club_name}'")
        else:
            # Tous les clubs
            users = get_all_users(cursor)
            
            if users:
                print("\nTous les utilisateurs par club:")
                current_club = None
                for email, first_name, last_name, role, club_name in users:
                    if current_club != club_name:
                        current_club = club_name
                        print(f"\n-- Club: {club_name or 'Sans club'} --")
                    print(f"{last_name} {first_name} - {email} - Rôle: {role}")
                
                # Exportation vers CSV
                csv_filename = "all_users_by_club.csv"
                export_to_csv(users, csv_filename, ["Email", "Prénom", "Nom", "Rôle", "Club"])
            else:
                print("Aucun utilisateur trouvé dans la base de données")
        
        # Fermeture du curseur et de la connexion
        cursor.close()
        connection.close()
        print("\nConnexion fermée.")
        
    except Exception as e:
        print(f"Échec de la connexion ou du traitement: {e}")

if __name__ == "__main__":
    main()