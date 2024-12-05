import { FC } from 'react'

interface HeaderProps {
  clubName: string
}

const Header: FC<HeaderProps> = ({ clubName }) => {
  return (
    <header className="px-3 pt-3">
      <h1 className="text-2xl font-bold">{clubName}</h1>
    </header>
  )
}

export default Header

