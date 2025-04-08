// app/api/map-editor/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getFirestore, collection, getDocs, updateDoc, doc, setDoc, addDoc, deleteDoc, Timestamp } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { initializeApp, getApps } from "firebase/app";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options"; // Adjust path as needed

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

// Initialize Firebase only if not already initialized
if (!getApps().length) {
  if (!firebaseConfig.projectId) {
    throw new Error("Firebase configuration is missing projectId");
  }
  initializeApp(firebaseConfig);
}

const db = getFirestore();
const storage = getStorage();

// Utility function to check admin permissions
const canEdit = async (session: any, item: any): Promise<boolean> => {
  if (!session?.user?.id || !session?.user?.name) return false;
  const adminId = session.user.id === "1" ? 1 : 2; // Admin1 has ID 1
  return adminId === 1 || (item.createdBy === session.user.name && !item.lock);
};

// GET: Fetch provinces and districts
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const provinceId = searchParams.get("provinceId");
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (provinceId) {
      const provinceRef = doc(db, "provinces", provinceId);
      const provinceSnap = await getDocs(collection(db, `provinces/${provinceId}/districts`));
      const districts = provinceSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      return NextResponse.json({ districts });
    }

    const provincesSnapshot = await getDocs(collection(db, "provinces"));
    const provincesData = await Promise.all(
      provincesSnapshot.docs.map(async (doc) => {
        const districtsSnapshot = await getDocs(collection(db, `provinces/${doc.id}/districts`));
        const districts = districtsSnapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        return {
          id: doc.id,
          ...doc.data(),
          districts,
        };
      })
    );

    return NextResponse.json(provincesData);
  } catch (error) {
    console.error("GET Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST: Create new province, district, or media
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { type, data } = await req.json();

    if (!type || !data) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (type === "province") {
      const provinceId = data.id || data.name.toLowerCase().replace(/\s/g, "-");
      const provinceData = {
        id: provinceId,
        name: data.name,
        thaiName: data.thaiName,
        totalArea: data.totalArea || 0,
        historicalPeriods: data.historicalPeriods || [],
        tags: data.tags || [],
        createdAt: Timestamp.now(),
        createdBy: session.user.name,
        lock: false,
        version: 1,
        collabSymbol: data.collabSymbol || "",
        backgroundSvgPath: data.backgroundSvgPath || null,
        backgroundImageUrl: data.backgroundImageUrl || null,
        backgroundDimensions: data.backgroundDimensions || null,
      };
      const provinceRef = doc(db, "provinces", provinceId);
      await setDoc(provinceRef, provinceData);
      return NextResponse.json({ ...provinceData, districts: [] }, { status: 201 });
    }

    if (type === "district") {
      const { provinceId, ...districtData } = data;
      if (!provinceId) {
        return NextResponse.json({ error: "Province ID is required" }, { status: 400 });
      }
      const districtId = districtData.id || districtData.name.toLowerCase().replace(/\s/g, "-");
      const newDistrict = {
        id: districtId,
        name: districtData.name,
        thaiName: districtData.thaiName,
        mapImageUrl: districtData.mapImageUrl || "",
        googleMapsUrl: districtData.googleMapsUrl || "",
        coordinates: districtData.coordinates || { x: 300, y: 200, width: 100, height: 100 },
        historicalColor: districtData.historicalColor || "rgba(255, 255, 255, 0.5)",
        historicalPeriods: districtData.historicalPeriods || [],
        createdAt: Timestamp.now(),
        createdBy: session.user.name,
        lock: false,
        version: 1,
        ...(districtData.collab && { collab: districtData.collab }),
      };
      const districtRef = doc(db, `provinces/${provinceId}/districts`, districtId);
      await setDoc(districtRef, newDistrict);
      return NextResponse.json(newDistrict, { status: 201 });
    }

    if (type === "media") {
      const { provinceId, districtId, file, periodIndex } = data;
      if (!provinceId || !districtId || !file) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
      }

      const districtRef = doc(db, `provinces/${provinceId}/districts`, districtId);
      const districtSnap = await getDocs(collection(db, `provinces/${provinceId}/districts`));
      const districtData = districtSnap.docs.find((d) => d.id === districtId)?.data();

      if (!districtData || !(await canEdit(session, districtData))) {
        return NextResponse.json({ error: "District not found or permission denied" }, { status: 403 });
      }

      const fileBuffer = Buffer.from(file.buffer);
      const fileRef = ref(storage, `media/${provinceId}/${districtId}/${Date.now()}_${file.name}`);
      await uploadBytes(fileRef, fileBuffer);
      const url = await getDownloadURL(fileRef);

      const historicalPeriods = districtData.historicalPeriods || [];
      historicalPeriods[periodIndex].media = historicalPeriods[periodIndex].media || [];
      historicalPeriods[periodIndex].media.push({
        type: file.type.includes("image") ? "image" : "video",
        url,
        altText: "",
        description: "",
        createdAt: Timestamp.now(),
      });

      await updateDoc(districtRef, { historicalPeriods });
      return NextResponse.json({ url }, { status: 201 });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (error) {
    console.error("POST Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// PUT: Update province, district, or map image
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { type, id, data, provinceId } = await req.json();

    if (!type || !id || !data) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (type === "province") {
      const provinceRef = doc(db, "provinces", id);
      const provinceSnap = (await getDocs(collection(db, "provinces"))).docs.find((d) => d.id === id);
      const provinceData = provinceSnap?.data();

      if (!provinceData || !(await canEdit(session, provinceData))) {
        return NextResponse.json({ error: "Province not found or permission denied" }, { status: 403 });
      }

      const updatedProvince = {
        ...provinceData,
        ...data,
        updatedAt: Timestamp.now(),
      };
      await updateDoc(provinceRef, updatedProvince);
      return NextResponse.json(updatedProvince);
    }

    if (type === "district") {
      if (!provinceId) {
        return NextResponse.json({ error: "Province ID is required" }, { status: 400 });
      }
      const districtRef = doc(db, `provinces/${provinceId}/districts`, id);
      const districtSnap = await getDocs(collection(db, `provinces/${provinceId}/districts`));
      const districtData = districtSnap.docs.find((d) => d.id === id)?.data();

      if (!districtData || !(await canEdit(session, districtData))) {
        return NextResponse.json({ error: "District not found or permission denied" }, { status: 403 });
      }

      const updatedDistrict = {
        ...districtData,
        ...data,
        updatedAt: Timestamp.now(),
      };
      await updateDoc(districtRef, updatedDistrict);
      return NextResponse.json(updatedDistrict);
    }

    if (type === "mapImage") {
      const { provinceId, districtId, file } = data;
      if (!provinceId || !districtId || !file) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
      }

      const districtRef = doc(db, `provinces/${provinceId}/districts`, districtId);
      const districtSnap = await getDocs(collection(db, `provinces/${provinceId}/districts`));
      const districtData = districtSnap.docs.find((d) => d.id === districtId)?.data();

      if (!districtData || !(await canEdit(session, districtData))) {
        return NextResponse.json({ error: "District not found or permission denied" }, { status: 403 });
      }

      let url;
      if (file.buffer) {
        const fileBuffer = Buffer.from(file.buffer);
        const fileRef = ref(storage, `maps/${provinceId}/${districtId}/${Date.now()}_${file.name}`);
        await uploadBytes(fileRef, fileBuffer);
        url = await getDownloadURL(fileRef);
      } else if (file.url) {
        url = file.url;
      } else {
        return NextResponse.json({ error: "File or URL required" }, { status: 400 });
      }

      await updateDoc(districtRef, { mapImageUrl: url, updatedAt: Timestamp.now() });
      return NextResponse.json({ url });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (error) {
    console.error("PUT Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE: Delete province or district
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const id = searchParams.get("id");
  const provinceId = searchParams.get("provinceId");

  try {
    if (!type || !id) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (type === "province") {
      const provinceRef = doc(db, "provinces", id);
      const provinceSnap = (await getDocs(collection(db, "provinces"))).docs.find((d) => d.id === id);
      const provinceData = provinceSnap?.data();

      if (!provinceData || !(await canEdit(session, provinceData))) {
        return NextResponse.json({ error: "Province not found or permission denied" }, { status: 403 });
      }

      await deleteDoc(provinceRef);
      return new NextResponse(null, { status: 204 });
    }

    if (type === "district") {
      if (!provinceId) {
        return NextResponse.json({ error: "Province ID is required" }, { status: 400 });
      }
      const districtRef = doc(db, `provinces/${provinceId}/districts`, id);
      const districtSnap = await getDocs(collection(db, `provinces/${provinceId}/districts`));
      const districtData = districtSnap.docs.find((d) => d.id === id)?.data();

      if (!districtData || !(await canEdit(session, districtData))) {
        return NextResponse.json({ error: "District not found or permission denied" }, { status: 403 });
      }

      await deleteDoc(districtRef);
      return new NextResponse(null, { status: 204 });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (error) {
    console.error("DELETE Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}