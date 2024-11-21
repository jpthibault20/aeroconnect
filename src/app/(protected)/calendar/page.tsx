"use server";

import React from 'react';
import PageComponent from '@/components/calendar/PageComponent';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const Page = async () => {

    const sessions = await prisma.flight_sessions.findMany({
        where: { clubID: "LF5722" },
    });

    return (
        <PageComponent sessions={sessions} />
    );
};

export default Page;
