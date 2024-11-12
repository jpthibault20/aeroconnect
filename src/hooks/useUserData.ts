import useSWR from 'swr';
import { getUser } from "@/api/db/users";

const useUserData = () => {
    const { data, error } = useSWR('/api/user', getUser, {
        revalidateOnFocus: false,
        shouldRetryOnError: false,
    });

    return {
        user: data?.user,
        loading: !data && !error,
        error,
    };
};

export default useUserData;
