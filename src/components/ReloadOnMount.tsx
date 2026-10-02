"use client";

import { useEffect } from "react";

/**
 * Reloads the page once after mount. Used when server data changed while the
 * page was rendering (demo club refresh, see the protected layout): a full
 * reload re-reads everything, including client state initialized from props.
 */
export default function ReloadOnMount() {
    useEffect(() => {
        window.location.reload();
    }, []);
    return null;
}
