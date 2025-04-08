// app/api/admin/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase-config';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      fullName,
      email,
      username,
      password,
      institution,
      researchBackground,
      contributionPlan,
    } = body;

    // Basic validation (you can expand this)
    if (!fullName || !email || !username || !password || !researchBackground || !contributionPlan) {
      return NextResponse.json(
        { error: 'All required fields must be provided' },
        { status: 400 }
      );
    }

    // Store the admin request in Firestore
    const requestRef = doc(db, 'adminRequests', username);
    await setDoc(requestRef, {
      fullName,
      email,
      username,
      password, // In a real app, hash this server-side (e.g., with bcrypt)
      institution: institution || '',
      researchBackground,
      contributionPlan,
      status: 'pending',
      requestDate: new Date().toISOString(),
    });

    return NextResponse.json(
      { message: 'Request submitted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'An error occurred while submitting your request' },
      { status: 500 }
    );
  }
}