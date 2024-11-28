import React from 'react'

interface Props {
    planesLenght: number;
}

const Header = ({ planesLenght }: Props) => {
    return (
        <div className='flex space-x-3'>
            <p className='font-medium text-3xl'>Les avions</p>
            <p className='text-[#797979] text-3xl'>{planesLenght}</p>
        </div>
    )
}

export default Header
