import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-config"; // Updated import
import { collection, getDocs, addDoc, deleteDoc, doc } from "firebase/firestore";

export async function POST(req: NextRequest) {
  try {
    const { id } = await req.json();
    const registersSnapshot = await getDocs(collection(db, "register"));
    const registerDoc = registersSnapshot.docs.find((doc) => doc.data().id === id);

    if (!registerDoc) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const registerData = registerDoc.data();
    await addDoc(collection(db, "admins"), {
      id: registerData.id,
      name: registerData.name,
      username: registerData.username,
      email: registerData.email,
      hashedPassword: registerData.hashedPassword,
      role: "admin",
    });

    await deleteDoc(doc(db, "register", registerDoc.id));
    return NextResponse.json({ message: "Admin approved" }, { status: 200 });
  } catch (error) {
    console.error("Approval error:", error);
    return NextResponse.json({ error: "Failed to approve admin" }, { status: 500 });
  }
}