import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const clubID = "LFXX-SEED";

    const planes = [
        { name: "Zenair CH701", immatriculation: "F-JXZA", classes: 3, hobbsTotal: 1120.5 },
        { name: "FK9 Mark VI", immatriculation: "F-JFKM", classes: 3, hobbsTotal: 680.3 },
        { name: "Savage Cruiser", immatriculation: "F-JSAV", classes: 3, hobbsTotal: 340.8 },
        { name: "Guimbal Cabri G2", immatriculation: "F-HGUI", classes: 6, hobbsTotal: 512.0 },
    ];

    for (const pl of planes) {
        const existing = await prisma.planes.findFirst({ where: { immatriculation: pl.immatriculation, clubID } });
        if (existing) {
            console.log(`⏭️  ${pl.name} (${pl.immatriculation}) existe déjà`);
            continue;
        }
        await prisma.planes.create({ data: { ...pl, clubID, operational: true } });
        console.log(`✅ ${pl.name} (${pl.immatriculation}) — classe ${pl.classes}`);
    }

    console.log("\n🎉 Terminé !");
    await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
