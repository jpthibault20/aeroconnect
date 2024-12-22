"use client";

import { createPagesBrowserClient } from "@supabase/auth-helpers-nextjs";
import { useEffect } from "react";

const useSupabaseSession = () => {
    const supabase = createPagesBrowserClient();

    useEffect(() => {
        const syncSession = async () => {
            const {
                data: { session },
            } = await supabase.auth.getSession();

            // Si une session existe déjà, la sauvegarder dans localStorage
            if (session) {
                localStorage.setItem("supabase.session", JSON.stringify(session));
            } else {
                // Sinon, tenter de restaurer une session sauvegardée
                const storedSession = localStorage.getItem("supabase.session");
                if (storedSession) {
                    const parsedSession = JSON.parse(storedSession);
                    await supabase.auth.setSession(parsedSession);
                }
            }
        };

        // Écoute les changements d'état de la session
        const { data: authListener } = supabase.auth.onAuthStateChange(
            (event, session) => {
                if (session) {
                    localStorage.setItem("supabase.session", JSON.stringify(session));
                } else {
                    localStorage.removeItem("supabase.session");
                }
            }
        );

        syncSession();

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, [supabase]);

    return supabase;
};

export default useSupabaseSession;
