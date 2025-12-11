import React from 'react'

interface Props {
    planesLenght: number; // Note: petite faute de frappe ici ("Length" au lieu de "Lenght"), mais je garde ton nom de prop pour ne pas casser ton code parent.
}

const Header = ({ planesLenght }: Props) => {
    return (
        <div className='flex items-center space-x-3'>
            {/* Titre principal : Plus gras, couleur Slate-900 pour le contraste */}
            <h1 className='font-bold text-3xl text-slate-900 tracking-tight'>
                Les avions
            </h1>

            {/* Badge Compteur : Style "Pilule" élégant */}
            {/* Ce style est identique à celui de la page "Mes vols" pour la cohérence */}
            <span className='px-3 py-1 bg-white text-purple-600 border border-purple-100 font-semibold rounded-full text-sm shadow-sm'>
                {planesLenght} {planesLenght > 1 ? 'appareils' : 'appareil'}
            </span>
        </div>
    )
}

export default Header