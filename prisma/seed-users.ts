import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    // Récupérer ton profil pour connaître le club
    const me = await prisma.user.findFirst({ where: { email: "tjeanpierre757@gmail.com" } });
    if (!me || !me.clubID) {
        console.log("❌ Profil ou club introuvable");
        return;
    }

    const clubID = me.clubID;
    console.log(`Club: ${clubID}\n`);

    const users = [
        // Instructeurs
        { firstName: "Marc", lastName: "Delacroix", email: "marc.delacroix@fictif.local", phone: "0601010101", role: "INSTRUCTOR" as const, classes: [3, 6] },
        { firstName: "Claire", lastName: "Beaumont", email: "claire.beaumont@fictif.local", phone: "0602020202", role: "INSTRUCTOR" as const, classes: [3, 6] },
        // Élèves
        { firstName: "Julien", lastName: "Morel", email: "julien.morel@fictif.local", phone: "0603030303", role: "STUDENT" as const, classes: [3] },
        { firstName: "Manon", lastName: "Dubois", email: "manon.dubois@fictif.local", phone: "0604040404", role: "STUDENT" as const, classes: [3] },
        { firstName: "Romain", lastName: "Leroy", email: "romain.leroy@fictif.local", phone: "0605050505", role: "STUDENT" as const, classes: [3] },
    ];

    for (const u of users) {
        // Éviter les doublons
        const existing = await prisma.user.findUnique({ where: { email: u.email } });
        if (existing) {
            console.log(`⏭️  ${u.firstName} ${u.lastName} existe déjà`);
            continue;
        }

        await prisma.user.create({
            data: {
                firstName: u.firstName,
                lastName: u.lastName,
                email: u.email,
                phone: u.phone,
                role: u.role,
                clubID,
                classes: u.classes,
            },
        });
        console.log(`✅ ${u.role.padEnd(10)} ${u.firstName} ${u.lastName}`);
    }

    console.log("\n🎉 Terminé !");
    await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
