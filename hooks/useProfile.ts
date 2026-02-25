import { useQuery } from '@tanstack/react-query';
import { getProfile, CustomerProfile } from '../services/authService';
import { useAuth } from '../context/AuthContext';

export function useProfile() {
    const { token, isLoading: authLoading } = useAuth();

    return useQuery<CustomerProfile, Error>({
        queryKey: ['profile'],
        queryFn: async () => {
            const data = await getProfile();
            return data;
        },
        // Only run the query if we have a token, and auth has finished loading
        enabled: !!token && !authLoading,
    });
}
