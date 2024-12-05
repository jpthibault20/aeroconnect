import React, { useState } from 'react'
import { Button } from './ui/button';
import InputComponent from './InputComponent';
import { Club } from '@prisma/client';
import { set } from 'date-fns';

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
            <div>
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

            </div>

            {/* Submit button */}
            <div className='flex flex-col'>
                <Button variant={"perso"} onClick={onSubmit}>
                    Créer le club
                </Button>
                <Button variant={"ghost"} onClick={() => setNewClub(false)}>
                    Retour
                </Button>
            </div>

        </div>
    )
}

export default NewClub
