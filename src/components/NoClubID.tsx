"use client"

import { useState } from "react"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const NoClubID = () => {
    const [isOpen, setIsOpen] = useState(true)

    const fermerCarte = () => setIsOpen(false)

    return (
        isOpen ? (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center transition-opacity duration-300">
                <Card className="w-[300px]">
                    <CardContent className="pt-6">
                        <p>Contenu de la carte</p>
                    </CardContent>
                    <CardFooter className="flex justify-end">
                        <Button onClick={fermerCarte}>Fermer</Button>
                    </CardFooter>
                </Card>
            </div>
        ) : null

    )
}

export default NoClubID
