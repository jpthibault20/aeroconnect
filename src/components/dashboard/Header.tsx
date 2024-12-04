import { FC } from 'react'

interface HeaderProps {
  clubName: string
}

const Header: FC<HeaderProps> = ({ clubName }) => {
  return (
    <header className="p-4">
      <h1 className="text-2xl font-bold">{clubName}</h1>
      <span className='flex justify-end text-gray-500'> Dernière mise a jour : 10/10/2023 19:00</span>
    </header>
  )
}

export default Header

