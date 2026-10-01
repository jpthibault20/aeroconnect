import React from 'react'

interface Props {
    planesLenght: number; // sic: prop name kept to avoid breaking callers
}

const Header = ({ planesLenght }: Props) => {
    return (
        <div className='flex items-center space-x-3'>
            <h1 className='font-bold text-3xl text-slate-900 tracking-tight'>
                Les avions
            </h1>

            {/* Same style as the "My flights" page for consistency */}
            <span className='px-3 py-1 bg-white text-purple-600 border border-purple-100 font-semibold rounded-full text-sm shadow-sm'>
                {planesLenght} {planesLenght > 1 ? 'appareils' : 'appareil'}
            </span>
        </div>
    )
}

export default Header