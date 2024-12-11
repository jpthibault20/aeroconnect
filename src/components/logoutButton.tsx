
import { signOut } from '@/app/auth/login/action'
import { Button } from './ui/button'
import { LogOut } from 'lucide-react'
import { useState } from 'react';


const PhoneLogoutButton = () => {
    const [loading, setLoading] = useState(false);

    return (
        <Button
            className=''
            variant={'outline'}
            onClick={() => {
                signOut();
                setLoading(true);
            }}
            disabled={loading}
        >
            <LogOut size={15} />
        </Button>
    )
}

export default PhoneLogoutButton