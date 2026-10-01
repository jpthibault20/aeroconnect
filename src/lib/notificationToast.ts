"use client"
import { toast } from "@/hooks/use-toast";

/** Warning toast for `sendNotificationsOrWarn` (see lib/notifications). */
export const warnNotificationFailure = (description: string) =>
    toast({ title: "Notification non envoyée", description, variant: "destructive" });
