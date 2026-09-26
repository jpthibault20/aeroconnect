import { FC } from "react";
import { useCurrentClub } from "@/app/context/useCurrentClub";
import { CLUB_TAB_LABELS, ClubTab } from "@/lib/clubAccess";
import { cn } from "@/lib/utils";

interface HeaderProps {
  tabs: ClubTab[];
  active: ClubTab;
  onSelect: (tab: ClubTab) => void;
  // Counter badge per tab (e.g. requests to handle).
  badges?: Partial<Record<ClubTab, number>>;
}

/**
 * Sticky header of the Club page: club name and tab bar, horizontally scrollable
 * on phones. Hidden when only one tab is accessible.
 */
const Header: FC<HeaderProps> = ({ tabs, active, onSelect, badges = {} }) => {
  const { currentClub } = useCurrentClub();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="container mx-auto px-4 pt-4">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Espace club</p>
        <h1 className="truncate pb-3 text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">
          {currentClub?.Name || "Chargement..."}
        </h1>

        {tabs.length > 1 && (
          <nav aria-label="Sections de la page club" className="-mx-4 flex gap-1 overflow-x-auto px-2 sm:mx-0 sm:px-0">
            {tabs.map((tab) => {
              const isActive = tab === active;
              const badge = badges[tab] ?? 0;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => onSelect(tab)}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 flex-shrink-0 items-center gap-1.5 border-b-[3px] px-3 text-sm transition-colors",
                    isActive
                      ? "border-[#774BBE] font-bold text-[#774BBE]"
                      : "border-transparent font-medium text-slate-600 hover:text-slate-900"
                  )}
                >
                  {CLUB_TAB_LABELS[tab]}
                  {badge > 0 && (
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-700 px-1.5 text-[11px] font-bold text-white">
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;
