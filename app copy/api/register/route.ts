import { NextRequest, NextResponse } from "next/server";
import { db, storage } from "@/lib/firebase-config";
import { collection, getDocs, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const name = formData.get("name") as string;
    const username = formData.get("username") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const purpose = formData.get("purpose") as string;
    const cv = formData.get("cv") as File;

    console.log("Received form data:", { name, username, email, password, purpose, cvName: cv?.name });

    if (!name || !username || !email || !password || !cv) {
      console.error("Missing required fields");
      return NextResponse.json({ error: "All required fields must be provided" }, { status: 400 });
    }

    // Check for existing username or email
    console.log("Checking for existing users...");
    const adminsSnapshot = await getDocs(collection(db, "admins"));
    const registersSnapshot = await getDocs(collection(db, "register"));
    const allUsers = [...adminsSnapshot.docs, ...registersSnapshot.docs].map((doc) => doc.data());

    if (allUsers.some((user) => user.username === username)) {
      console.error("Username already taken:", username);
      return NextResponse.json({ error: "Username already taken" }, { status: 400 });
    }
    if (allUsers.some((user) => user.email === email)) {
      console.error("Email already registered:", email);
      return NextResponse.json({ error: "Email already registered" }, { status: 400 });
    }

    // Generate new ID
    const latestAdminDoc = adminsSnapshot.docs[adminsSnapshot.size - 1];
    const latestIdNum = latestAdminDoc
      ? parseInt(latestAdminDoc.data().id.replace("admin", ""), 10)
      : 0;
    const newId = `admin${latestIdNum + 1}`;
    console.log("Generated new ID:", newId);

    // Upload CV to Firebase Storage
    console.log("Uploading CV to Firebase Storage...");
    const cvRef = ref(storage, `cvs/${newId}-${cv.name}`);
    await uploadBytes(cvRef, cv); // Use the File object directly
    const cvUrl = await getDownloadURL(cvRef);
    console.log("CV uploaded successfully, URL:", cvUrl);

    // Hash password
    console.log("Hashing password...");
    const hashedPassword = await bcrypt.hash(password, 10);

    // Save to register collection
    const registerData = {
      id: newId,
      name,
      username,
      email,
      hashedPassword,
      purpose: purpose || "",
      cvUrl,
      status: "pending" as const,
      createdAt: new Date().toISOString(),
    };
    console.log("Saving to Firestore:", registerData);

    await addDoc(collection(db, "register"), registerData);
    console.log("Registration data saved successfully");

    return NextResponse.json({ message: "Registration request submitted", id: newId }, { status: 201 });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      {
        error: "Failed to submit registration request",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}