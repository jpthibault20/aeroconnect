"use client"
import { toast } from "@/hooks/use-toast";

/** Toast d'avertissement pour `sendNotificationsOrWarn` (cf. lib/notifications). */
export const warnNotificationFailure = (description: string) =>
    toast({ title: "Notification non envoyée", description, variant: "destructive" });
