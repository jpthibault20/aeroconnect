import React, { useState } from 'react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';
import { IoIosWarning } from 'react-icons/io';
import { Button } from './ui/button';
import { requestClubID } from '@/api/db/club';
import { useCurrentUser } from '@/app/context/useCurrentUser';
import { Spinner } from './ui/SpinnerVariants';

interface Club {
    id: string;
    name: string;
}

interface props {
    setError: React.Dispatch<React.SetStateAction<string | null>>;
    setLoading: React.Dispatch<React.SetStateAction<boolean>>;
    setRequestClubID: React.Dispatch<React.SetStateAction<boolean>>;
    clubs: Club[];
    loading: boolean;
    error: string | null;
    newClubButton: () => void;
    setSelectedClubID: React.Dispatch<React.SetStateAction<string>>;
}

const RequestClubID = ({ setError, clubs, loading, error, newClubButton, setRequestClubID, setSelectedClubID, setLoading }: props) => {
    const { currentUser } = useCurrentUser();
    const [selectedClub, setSelectedClub] = useState<Club>({
        id: "",
        name: "Choisissez votre club",
    });

    const onSubmit = async () => {
        setLoading(true);
        setSelectedClubID(selectedClub.id)
        const res = await requestClubID(selectedClub.id, currentUser!.id)
        if (res.error) {
            console.log(res.error);
            setError(res.error);
        } else {
            setError(null);
            setRequestClubID(true);

        }
        setLoading(false);
    };

    return (
        <div className="p-6 space-y-6">
            {/* Content */}
            <div className="flex flex-col space-y-4">
                <span className="font-semibold">Votre club :</span>
                {loading ? (
                    <p className="text-gray-600">Chargement des clubs...</p>
                ) : (
                    <DropdownMenu>
                        <DropdownMenuTrigger>
                            <div className="border border-gray-600 rounded-lg px-3 py-2 flex items-center justify-between shadow-md">
                                <span>{selectedClub.name}</span>
                                <ChevronDown />
                            </div>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            {clubs.map((club) => (
                                <DropdownMenuItem
                                    key={club.id}
                                    onSelect={() => setSelectedClub(club)}
                                >
                                    {club.name}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>

            {/* Error message */}
            {error && (
                <div className="text-red-500 w-full p-2 bg-[#FFF4F4] rounded-lg flex items-center space-x-2">
                    <IoIosWarning size={20} />
                    <div>{error}</div>
                </div>
            )}

            {/* Footer */}
            <div className='space-y-2'>
                {/* Submit button */}
                <div className="flex justify-center items-center">
                    <Button
                        onClick={onSubmit}
                        variant={"perso"}
                        disabled={loading}
                    >
                        {loading ? (
                            <Spinner />
                        ) : (
                            "Valider"
                        )}
                    </Button>

                </div>
                {/* Create new club button */}
                <div className='flex justify-center items-center'>
                    <button className='underline text-gray-400 hover:text-gray-700 text-sm' onClick={newClubButton}>
                        Ajouter un club
                    </button>
                </div>
            </div>

        </div>
    )
}

export default RequestClubID
