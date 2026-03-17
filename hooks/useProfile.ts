import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { auth } from '../firebaseConfig';
import { CustomerProfile, getProfileFromFirebase, updateProfileInFirebase } from '../services/authService';

export function useProfile() {
    const { user, token, userType, isLoading: authLoading } = useAuth();
    const uid = user?.uid;

    console.log(`[useProfile] uid=${uid || 'NULL'}, token=${token ? 'EXISTS' : 'NULL'}, userType=${userType}, authLoading=${authLoading}`);

    return useQuery<CustomerProfile | null, Error>({
        queryKey: ['profile', uid],
        queryFn: async () => {
            console.log(`[useProfile] Triggered queryFn for UID: ${uid}`);
            if (!uid || !userType) {
                console.log(`[useProfile] Skipping fetch: uid=${uid}, userType=${userType}`);
                return null;
            }
            return await getProfileFromFirebase(uid, userType);
        },
        // Only run the query if we have a token, auth has finished loading, and we have a UID
        enabled: !!token && !authLoading && !!uid,
    });
}

export function useUpdateProfile() {
    const queryClient = useQueryClient();
    const { user, userType } = useAuth();
    const uid = user?.uid;

    return useMutation<void, Error, Partial<CustomerProfile>>({
        mutationFn: async (data: Partial<CustomerProfile>) => {
            if (!uid || !userType) throw new Error("Not authenticated");
            return await updateProfileInFirebase(uid, userType, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['profile'] });
        },
    });
}
