import { NextResponse } from 'next/server';
import { adminAuth } from '../lib/firebaseAdmin';

export interface AuthenticatedRequest extends Request {
    user?: {
        uid: string;
        email?: string;
        [key: string]: any;
    };
}

export function withAuth(
    handler: (req: AuthenticatedRequest, ...args: any[]) => Promise<NextResponse> | NextResponse
) {
    return async (req: Request, ...args: any[]) => {
        try {
            const authHeader = req.headers.get('Authorization');

            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return NextResponse.json(
                    { success: false, message: 'Unauthorized: Missing or invalid token' },
                    { status: 401 }
                );
            }

            const idToken = authHeader.split('Bearer ')[1];

            try {
                const decodedToken = await adminAuth.verifyIdToken(idToken);

                // Inject verified user into request
                const authReq = req as AuthenticatedRequest;
                authReq.user = decodedToken;

                return await handler(authReq, ...args);
            } catch (tokenError: any) {
                console.error('Token verification failed:', tokenError);
                return NextResponse.json(
                    { success: false, message: 'Unauthorized: Invalid token' },
                    { status: 401 }
                );
            }
        } catch (error: any) {
            console.error('Server error in auth middleware:', error);
            return NextResponse.json(
                { success: false, message: 'Internal Server Error' },
                { status: 500 }
            );
        }
    };
}
