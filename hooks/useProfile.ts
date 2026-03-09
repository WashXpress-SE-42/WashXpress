import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { auth } from '../firebaseConfig';
import { CustomerProfile, getProfileFromFirebase, updateProfileInFirebase } from '../services/authService';

export function useProfile() {
    const { token, userType, isLoading: authLoading } = useAuth();
    const currentUser = auth.currentUser;

    return useQuery<CustomerProfile | null, Error>({
        queryKey: ['profile', currentUser?.uid],
        queryFn: async () => {
            if (!currentUser?.uid || !userType) return null;
            return await getProfileFromFirebase(currentUser.uid, userType);
        },
        // Only run the query if we have a token, and auth has finished loading
        enabled: !!token && !authLoading && !!currentUser?.uid,
    });
}

export function useUpdateProfile() {
    const queryClient = useQueryClient();
    const { userType } = useAuth();
    const currentUser = auth.currentUser;

    return useMutation<void, Error, Partial<CustomerProfile>>({
        mutationFn: async (data: Partial<CustomerProfile>) => {
            if (!currentUser?.uid || !userType) throw new Error("Not authenticated");
            return await updateProfileInFirebase(currentUser.uid, userType, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['profile'] });
        },
    });
}
