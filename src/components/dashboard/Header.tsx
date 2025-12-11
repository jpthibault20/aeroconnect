import { useCurrentClub } from "@/app/context/useCurrentClub";
import { useCurrentUser } from "@/app/context/useCurrentUser";
import { Settings2, LayoutDashboard } from "lucide-react";
import { FC } from "react";

interface HeaderProps {
  display: "dashboard" | "settings";
  setDisplay: (display: "dashboard" | "settings") => void;
}

const Header: FC<HeaderProps> = ({ display, setDisplay }) => {
  const { currentClub } = useCurrentClub();
  const { currentUser } = useCurrentUser();

  const isDashboardActive = display === "dashboard";
  const isSettingsActive = display === "settings";

  // Sécurisation de l'accès : on utilise ?. au lieu de ! pour éviter les crashs si currentUser est null
  // On définit clairement qui a le droit d'accéder aux settings
  const canAccessSettings = currentUser?.role === "OWNER" || currentUser?.role === "ADMIN";

  return (
    <header className="flex flex-row justify-between items-center gap-4 p-4 bg-white/50 backdrop-blur-sm rounded-xl">
      {/* Club Name */}
      <div className="flex flex-col items-center sm:items-start">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">
          {currentClub?.Name || "Chargement..."}
        </h1>
        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
          Espace Club
        </p>
      </div>

      {/* Navigation Toggle */}
      <nav className="flex bg-slate-100 p-1.5 rounded-full shadow-inner border border-slate-200 mb-2">
        {/* Dashboard Button */}
        <button
          onClick={() => setDisplay("dashboard")}
          className={`
            flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ease-in-out
            ${isDashboardActive
              ? "bg-white text-blue-700 shadow-sm ring-1 ring-black/5"
              : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
            }
          `}
          aria-current={isDashboardActive ? "page" : undefined}
        >
          {/* On affiche l'icône sur mobile ET desktop pour un meilleur repère visuel */}
          <LayoutDashboard className={`w-4 h-4 ${isDashboardActive ? "text-blue-600" : "text-slate-400"}`} />
          <span className="hidden sm:inline">Statistiques</span>
        </button>

        {/* Settings Button */}
        <button
          onClick={() => canAccessSettings && setDisplay("settings")}
          disabled={!canAccessSettings}
          title={!canAccessSettings ? "Réservé aux administrateurs" : "Paramètres du club"}
          className={`
            flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ease-in-out
            ${isSettingsActive
              ? "bg-white text-blue-700 shadow-sm ring-1 ring-black/5"
              : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
            }
            ${!canAccessSettings ? "opacity-50 cursor-not-allowed grayscale" : ""}
          `}
          aria-current={isSettingsActive ? "page" : undefined}
        >
          <Settings2 className={`w-4 h-4 ${isSettingsActive ? "text-blue-600" : "text-slate-400"}`} />
          <span className="hidden sm:inline">Paramètres</span>
        </button>
      </nav>
    </header>
  );
};

export default Header;