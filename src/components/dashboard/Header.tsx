import { FC } from 'react'

interface HeaderProps {
  clubName: string
}

const Header: FC<HeaderProps> = ({ clubName }) => {
  return (
    <header className="bg-blue-600 text-white p-4">
      <h1 className="text-2xl font-bold">{clubName}</h1>
    </header>
  )
}

export default Header

