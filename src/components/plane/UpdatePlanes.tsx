import { planes } from '@prisma/client'
import React from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import { ScrollArea } from '../ui/scroll-area'

interface props {
    children: React.ReactNode
    showPopup: boolean
    setShowPopup: React.Dispatch<React.SetStateAction<boolean>>
    plane: planes
    setPlanes: React.Dispatch<React.SetStateAction<planes[]>>
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const UpdatePlanes = ({ children, showPopup, setShowPopup, plane, setPlanes }: props) => {
    return (
        <div className='flex justify-center items-center'>
            <Dialog open={showPopup} onOpenChange={setShowPopup}>
                <DialogTrigger asChild >
                    {children}
                </DialogTrigger>
                <DialogContent className='sm:max-w-[425px]'>
                    <DialogHeader>
                        <DialogTitle>Mise à jour du profil</DialogTitle>
                        <DialogDescription>
                            Modifiez les informations du profil de l&apos;utilisateur
                        </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className='h-[500px]' >
                        <div>
                            update planes
                        </div>
                    </ScrollArea>
                </DialogContent>

            </Dialog>
        </div>


    )
}

export default UpdatePlanes
