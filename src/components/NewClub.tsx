import React, { useState } from 'react'
import { Button } from './ui/button';
import InputComponent from './InputComponent';
import { Club } from '@prisma/client';

interface props {
    setNewClub: React.Dispatch<React.SetStateAction<boolean>>;
}

const NewClub = ({ setNewClub }: props) => {
    const [clubState, setClubState] = useState<Club>({
        Name: "",
        Address: "",
        City: "",
        Country: "",
        ZipCode: "",
        OwnerId: [],
        DaysOn: [],
        HoursOn: [],
        SessionDurationMin: 0,
        AvailableMinutes: [],
        id: "",
    });

    const onSubmit = async () => {
        console.log("Submit button clicked");
        console.log(clubState);
    };

    return (
        <div className='flex flex-col justify-center items-center space-y-4'>

            {/* Form */}
            <div className='w-full space-y-3'>
                <InputComponent
                    id='name'
                    label='Nom du club'
                    value={clubState?.Name || ""}
                    loading={false}
                    onChange={(value) => setClubState((prev) => ({ ...prev, Name: value }))}
                    style=''
                />
                <InputComponent
                    id='id'
                    label='ID du club (LF_ _ _ _ )'
                    value={clubState?.id || ""}
                    loading={false}
                    onChange={(value) => setClubState((prev) => ({ ...prev, id: value }))}
                    style=''
                />
                <p>
                    DaysOn
                </p>
                <p>
                    HoursOn
                </p>
                <p>
                    SessionDurationMin
                </p>
                <p>
                    Adress
                </p>

            </div>

            {/* Submit button */}
            <div className='flex w-full justify-end items-center flex-row'>
                <Button variant={"ghost"} onClick={() => setNewClub(false)} className='text-gray-500'>
                    Retour
                </Button>
                <Button variant={"perso"} onClick={onSubmit}>
                    Créer le club
                </Button>
            </div>

        </div>
    )
}

export default NewClub
