import { NextResponse } from 'next/server';
import { adminDb } from '../../../../lib/firebaseAdmin';
import { withAuth, AuthenticatedRequest } from '../../../../middleware/auth';

/**
 * Example GET Handler for fetching customer data
 * Bound by the withAuth middleware to ensure user is logged in
 */
export const GET = withAuth(async (req: AuthenticatedRequest, { params }: { params: { uid: string } }) => {
    try {
        const { uid } = params;

        // Security Check: Ensure the user is requesting their own data
        // Or check if the user has an admin role (if you implement role-based claims)
        if (req.user?.uid !== uid) {
            return NextResponse.json(
                { success: false, message: 'Forbidden: Cannot access other users data' },
                { status: 403 }
            );
        }

        const customerDoc = await adminDb.collection('customers').doc(uid).get();

        if (!customerDoc.exists) {
            return NextResponse.json(
                { success: false, message: 'Customer not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: customerDoc.data(),
        });
    } catch (error: any) {
        console.error('Error fetching customer:', error);
        return NextResponse.json(
            { success: false, message: 'Failed to fetch customer data' },
            { status: 500 }
        );
    }
});

/**
 * Example POST Handler for creating OR updating customer data
 * Bound by the withAuth middleware
 */
export const POST = withAuth(async (req: AuthenticatedRequest, { params }: { params: { uid: string } }) => {
    try {
        const { uid } = params;

        // Security Check
        if (req.user?.uid !== uid) {
            return NextResponse.json(
                { success: false, message: 'Forbidden: Cannot mutate other users data' },
                { status: 403 }
            );
        }

        const payload = await req.json();

        // Automatically set tracking timestamps
        const updateData = {
            ...payload,
            updatedAt: new Date().toISOString(),
        };

        // Use merge: true to avoid overwriting the entire document if we are just updating fields
        await adminDb.collection('customers').doc(uid).set(updateData, { merge: true });

        return NextResponse.json({
            success: true,
            message: 'Customer profile updated successfully',
            data: updateData,
        });
    } catch (error: any) {
        console.error('Error updating customer:', error);
        return NextResponse.json(
            { success: false, message: 'Failed to update customer data' },
            { status: 500 }
        );
    }
});
