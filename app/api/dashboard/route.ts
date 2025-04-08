// app/api/dashboard/route.ts
import { NextResponse } from "next/server";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase-config"; // Ensure this matches your actual Firebase config path

interface AdminData {
  email: string;
  name: string;
  username: string;
  role?: string; // Optional role field from new requirements
}

interface Province {
  id: string;
  name: string;
  thaiName: string;
  districtCount: number;
}

interface RegisterData {
  id: string;
  name: string;
  username: string;
  email: string;
  purpose: string;
  cvUrl: string;
  status: "pending" | "approved" | "rejected";
}

interface DashboardData {
  totalProvinces: number;
  totalAdmins: number;
  totalDistricts: number;
  provinces: Province[];
  admins: AdminData[];
  registers: RegisterData[];
}

export async function GET() {
  try {
    // Get provinces data
    const provincesSnapshot = await getDocs(collection(db, "provinces"));
    const provinces: Province[] = [];
    let totalDistricts = 0;

    // Process each province
    for (const doc of provincesSnapshot.docs) {
      const provinceData = doc.data();

      // Count districts in subcollection
      const districtsSnapshot = await getDocs(
        collection(db, `provinces/${doc.id}/districts`)
      );
      const districtCount = districtsSnapshot.size;
      totalDistricts += districtCount;

      provinces.push({
        id: doc.id,
        name: provinceData.name || doc.id,
        thaiName: provinceData.thaiName || "",
        districtCount,
      });
    }

    // Get admins data
    const adminsSnapshot = await getDocs(collection(db, "admins"));
    const admins = adminsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        email: data.email || "",
        name: data.name || "",
        username: data.username || "",
        role: data.role || undefined, // Include role if present
      };
    });

    // Get registers data
    const registersSnapshot = await getDocs(collection(db, "register"));
    const registers = registersSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: data.id,
        name: data.name || "",
        username: data.username || "",
        email: data.email || "",
        purpose: data.purpose || "",
        cvUrl: data.cvUrl || "",
        status: data.status || "pending",
      };
    });

    const dashboardData: DashboardData = {
      totalProvinces: provincesSnapshot.size,
      totalAdmins: adminsSnapshot.size,
      totalDistricts,
      provinces,
      admins,
      registers,
    };

    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}