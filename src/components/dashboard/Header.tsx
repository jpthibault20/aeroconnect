import { ChartSpline, Settings2 } from "lucide-react";
import { FC } from "react";

interface HeaderProps {
  clubName: string;
  display: "dashboard" | "settings";
  setDisplay: (display: "dashboard" | "settings") => void;
}

const Header: FC<HeaderProps> = ({ clubName, display, setDisplay }) => {
  const onClick = () => {
    setDisplay(display === "dashboard" ? "settings" : "dashboard");
  };

  const isDashboardActive = display === "dashboard";
  const isSettingsActive = display === "settings";

  return (
    <header className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0 lg:p-4">
      {/* Club Name */}
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">{clubName}</h1>

      {/* Toggle Button */}
      <div className="flex border border-gray-300 rounded-full shadow-lg">
        {/* Dashboard Button */}
        <button
          onClick={onClick}
          className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-all ${isDashboardActive ? "bg-purple-800 text-white shadow-md" : "text-gray-500 hover:bg-gray-100"
            }`}
          aria-pressed={isDashboardActive}
        >
          <ChartSpline className="h-5 w-5 lg:hidden" />
          <span className="hidden lg:inline">Statistiques</span>
        </button>

        {/* Settings Button */}
        <button
          onClick={onClick}
          className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-all ${isSettingsActive ? "bg-purple-800 text-white shadow-md" : "text-gray-500 hover:bg-gray-100"
            }`}
          aria-pressed={isSettingsActive}
        >
          <Settings2 className="h-5 w-5 lg:hidden" />
          <span className="hidden lg:inline">Paramètres</span>
        </button>
      </div>
    </header>
  );
};

export default Header;
