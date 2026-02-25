import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../services/apiClient';
import { useAuth } from '../context/AuthContext';

export interface CustomerData {
    uid: string;
    email: string;
    displayName?: string;
    phoneNumber?: string;
    // Define other custom fields here depending on Firestore structure
    [key: string]: any;
}

/**
 * Hook to fetch customer data
 */
export function useCustomer() {
    const { user, token, isLoading: authLoading } = useAuth();

    return useQuery<CustomerData, Error>({
        queryKey: ['customer', user?.uid],
        queryFn: async () => {
            // apiClient.ts handles attaching the token internally 
            // but requires auth context to guarantee user object stability
            const result = await apiFetch(`/customers/${user?.uid}`);
            return result.data;
        },
        // Ensure we don't fire the query before Auth finishes checking
        enabled: !!token && !!user?.uid && !authLoading,
    });
}

/**
 * Hook to update customer data
 */
export function useUpdateCustomer() {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    return useMutation({
        mutationFn: async (updateData: Partial<CustomerData>) => {
            if (!user?.uid) throw new Error("User not authenticated");

            const result = await apiFetch(`/customers/${user.uid}`, {
                method: 'POST',
                body: JSON.stringify(updateData),
            });

            return result.data;
        },
        onSuccess: () => {
            // Invalidate the cache to trigger a UI refetch across the app
            queryClient.invalidateQueries({ queryKey: ['customer', user?.uid] });
        },
    });
}
