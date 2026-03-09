import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { CustomerProfile, getProfile, updateProfile } from '../services/authService';

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

export function useUpdateProfile() {
    const queryClient = useQueryClient();

    return useMutation<CustomerProfile, Error, Partial<CustomerProfile>>({
        mutationFn: async (data: Partial<CustomerProfile>) => {
            return await updateProfile(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['profile'] });
        },
    });
}
