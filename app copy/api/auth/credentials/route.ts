// app/api/auth/credentials/route.ts
import { NextRequest, NextResponse } from "next/server";
import { doc, getDoc, query, where, collection, getDocs } from "firebase/firestore";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { compare } from "bcrypt";

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

interface AdminUser {
  id: string;
  username: string;
  name: string;
  email: string;
  role: string;
}

export async function POST(req: NextRequest) {
  try {
    const { username: initialUsername, password } = await req.json(); // Use const for password, rename username for clarity
    let username = initialUsername; // Declare username as let for reassignment

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username or email and password are required" },
        { status: 400 }
      );
    }

    // Try username lookup
    const adminRef = doc(db, "admins", username);
    let adminSnap = await getDoc(adminRef);
    let adminData;

    if (!adminSnap.exists()) {
      // Try email lookup
      const adminsQuery = query(
        collection(db, "admins"),
        where("email", "==", username)
      );
      const querySnapshot = await getDocs(adminsQuery);

      if (querySnapshot.empty) {
        return NextResponse.json(
          { error: "Admin user not found" },
          { status: 404 }
        );
      }

      adminSnap = querySnapshot.docs[0];
      adminData = adminSnap.data();
      username = adminSnap.id; // Reassign username to the document ID
    } else {
      adminData = adminSnap.data();
    }

    if (!adminData || !adminData.hashedPassword) {
      return NextResponse.json(
        { error: "Admin data is incomplete or invalid" },
        { status: 400 }
      );
    }

    const isValidPassword = await compare(password, adminData.hashedPassword);

    if (!isValidPassword) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    const adminUser: AdminUser = {
      id: username,
      username: username,
      name: adminData.name || "Admin",
      email: adminData.email,
      role: (adminData.role === "master" || username === "admin1") ? "master" : (adminData.role || "admin"),
    };
    
    return NextResponse.json(adminUser);
  } catch (error) {
    console.error("Authentication error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}