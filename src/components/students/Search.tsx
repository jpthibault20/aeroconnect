import React from 'react';
import { Input } from '../ui/input';
import { Search as SearchIcon } from 'lucide-react';

interface Props {
    searchQuery: string;
    setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
}

const Search = ({ searchQuery, setSearchQuery }: Props) => {
    return (
        <div className="relative w-full md:w-72">
            {/* Icône positionnée en absolu à gauche */}
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SearchIcon className="h-4 w-4 text-slate-400" />
            </div>

            <Input
                type="text"
                placeholder="Rechercher un membre..."
                className="pl-10 bg-white border-slate-200 focus-visible:ring-[#774BBE] shadow-sm transition-all hover:border-slate-300"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />
        </div>
    )
}

export default Search;