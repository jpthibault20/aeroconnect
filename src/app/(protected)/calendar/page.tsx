"use server";

import React from 'react';
import PageComponent from '@/components/calendar/PageComponent';
import { PrismaClient } from '@prisma/client';
import { getUser } from '@/api/db/users';

const prisma = new PrismaClient();

const Page = async () => {
    const user = await getUser();

    const sessions = await prisma.flight_sessions.findMany({
        where: { clubID: user.user?.clubID }
    });

    return (
        <PageComponent sessionsprops={sessions} />
    );
};

export default Page;
