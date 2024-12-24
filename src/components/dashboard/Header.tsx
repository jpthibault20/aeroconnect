import { BarChart3, Settings, } from "lucide-react"
import { FC } from 'react'
import { Button } from "../ui/button"

interface HeaderProps {
  clubName: string,
  display: "dashboard" | "settings"
  setDisplay: (display: "dashboard" | "settings") => void
}

const Header: FC<HeaderProps> = ({ clubName, display, setDisplay }) => {
  return (
    <header className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0 lg:p-4">
      <h1 className="text-2xl sm:text-3xl font-bold">{clubName}</h1>
      <div className="flex items-center space-x-4">
        <div className="text-lg font-semibold">
          {display === "dashboard" ? "Statistiques" : "Paramètres"}
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setDisplay(display === "dashboard" ? "settings" : "dashboard")}
          aria-label={display === "dashboard" ? "Voir les paramètres" : "Voir le tableau de bord"}
        >
          {display === "dashboard" ? (
            <Settings className="h-5 w-5" />
          ) : (
            <BarChart3 className="h-5 w-5" />
          )}
        </Button>
      </div>
    </header>
  )
}

export default Header

