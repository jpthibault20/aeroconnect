import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    // Trouver le profil à conserver
    const allUsers = await prisma.user.findMany({ select: { id: true, firstName: true, lastName: true, email: true, clubID: true } });
    console.log("Utilisateurs existants :");
    allUsers.forEach((u) => console.log(`  - ${u.firstName} ${u.lastName} (${u.email}) [club: ${u.clubID}]`));

    // Chercher "jeanpierre thibault" (insensible à la casse, dans firstName ou lastName)
    const me = allUsers.find(
        (u) =>
            (u.firstName.toLowerCase().includes("thibault") || u.lastName.toLowerCase().includes("thibault")) &&
            (u.firstName.toLowerCase().includes("jeanpierre") || u.lastName.toLowerCase().includes("jeanpierre") ||
             u.firstName.toLowerCase().includes("jean-pierre") || u.lastName.toLowerCase().includes("jean-pierre") ||
             u.firstName.toLowerCase().includes("jean pierre") || u.lastName.toLowerCase().includes("jean pierre"))
    );

    if (!me) {
        console.log("\n❌ Profil 'jeanpierre thibault' introuvable. Utilisateurs disponibles ci-dessus.");
        console.log("   Relancez avec le bon nom.");
        await prisma.$disconnect();
        return;
    }

    console.log(`\n✅ Profil conservé : ${me.firstName} ${me.lastName} (${me.email})`);

    // Récupérer les clubs
    const clubs = await prisma.club.findMany({ select: { id: true, Name: true } });
    console.log(`✅ Clubs conservés : ${clubs.map((c) => `${c.id} (${c.Name})`).join(", ")}`);

    const clubIDs = clubs.map((c) => c.id);

    // Supprimer dans l'ordre des dépendances
    console.log("\n🧹 Nettoyage...");

    const delLogs = await prisma.flight_logs.deleteMany();
    console.log(`   flight_logs: ${delLogs.count} supprimés`);

    const delSessions = await prisma.flight_sessions.deleteMany();
    console.log(`   flight_sessions: ${delSessions.count} supprimées`);

    const delMaintenance = await prisma.maintenanceTask.deleteMany();
    console.log(`   maintenanceTask: ${delMaintenance.count} supprimées`);

    const delPlanes = await prisma.planes.deleteMany();
    console.log(`   planes: ${delPlanes.count} supprimés`);

    // Supprimer tous les users SAUF moi
    const delUsers = await prisma.user.deleteMany({
        where: { id: { not: me.id } },
    });
    console.log(`   users: ${delUsers.count} supprimés (${me.firstName} ${me.lastName} conservé)`);

    console.log("\n🎉 Nettoyage terminé !");
    console.log(`   Restent : 1 utilisateur, ${clubIDs.length} club(s), 0 sessions, 0 logs, 0 avions`);

    await prisma.$disconnect();
}

main().catch((e) => {
    console.error("❌ Erreur:", e);
    process.exit(1);
});
