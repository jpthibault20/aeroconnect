import React from 'react'
import { Input } from '../ui/input'

interface Props {
    searchQuery: string;
    setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
}

const Search = ({ searchQuery, setSearchQuery }: Props) => {
    return (
        <Input
            type="text"
            placeholder="Recherche..."
            className="p-2 rounded-lg w-full md:w-1/3 mr-10 bg-white"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
        />
    )
}

export default Search
