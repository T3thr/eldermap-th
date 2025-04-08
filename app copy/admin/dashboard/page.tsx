"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import toast, { Toaster } from "react-hot-toast";

interface AdminData {
  email: string;
  name: string;
  username: string;
  role?: string;
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

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    totalProvinces: 0,
    totalAdmins: 0,
    totalDistricts: 0,
    provinces: [],
    admins: [],
    registers: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await fetch("/api/dashboard");
        if (!response.ok) throw new Error("Failed to fetch dashboard data");
        const data: DashboardData = await response.json();
        setDashboardData(data);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        toast.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    if (status === "authenticated") fetchDashboardData();
  }, [status]);

  const handleApprove = async (registerId: string) => {
    try {
      const response = await fetch("/api/register/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: registerId }),
      });
      if (!response.ok) throw new Error("Approval failed");
      toast.success("Admin request approved!");
      setDashboardData((prev) => ({
        ...prev,
        registers: prev.registers.filter((reg) => reg.id !== registerId),
        admins: [...prev.admins, prev.registers.find((reg) => reg.id === registerId)!],
      }));
    } catch (error) {
      toast.error("Failed to approve request");
      console.error(error);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-4 text-lg font-medium text-foreground">Loading...</span>
      </div>
    );
  }

  const isMasterAdmin = session?.user?.id === "admin1" && session?.user?.role === "master";

  return (
    <div className="py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <Toaster position="top-right" />
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-primary">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Welcome back, {session?.user?.name || "Administrator"}!
        </p>
      </header>

      <main>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-card p-6 rounded-lg shadow glass-effect">
            <p className="text-sm text-foreground">Total Provinces</p>
            <p className="text-3xl font-semibold text-primary">{dashboardData.totalProvinces}</p>
          </div>
          <div className="bg-card p-6 rounded-lg shadow glass-effect">
            <p className="text-sm text-foreground">Total Districts</p>
            <p className="text-3xl font-semibold text-primary">{dashboardData.totalDistricts}</p>
          </div>
          <div className="bg-card p-6 rounded-lg shadow glass-effect">
            <p className="text-sm text-foreground">Administrators</p>
            <p className="text-3xl font-semibold text-primary">{dashboardData.totalAdmins}</p>
          </div>
        </div>

        <div className="bg-card p-6 rounded-lg shadow glass-effect mb-8">
          <Link href="/admin/map-editor" className="block">
            <h3 className="text-lg font-medium text-primary">Map Editor</h3>
            <p className="text-sm text-muted-foreground">
              Manage district maps and historical data
            </p>
          </Link>
        </div>

        <div className="bg-card p-6 rounded-lg shadow glass-effect mb-8">
          <h2 className="text-lg font-medium text-primary mb-4">Provinces</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-glass">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase">Thai Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase">Districts</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-glass">
                {dashboardData.provinces.map((province) => (
                  <tr key={province.id} className="hover:bg-accent/10">
                    <td className="px-6 py-4 text-sm text-foreground">{province.name}</td>
                    <td className="px-6 py-4 text-sm text-foreground">{province.thaiName}</td>
                    <td className="px-6 py-4 text-sm text-foreground">{province.districtCount}</td>
                    <td className="px-6 py-4">
                      <Link href="/admin/map-editor" className="text-primary hover:underline">Edit</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-card p-6 rounded-lg shadow glass-effect mb-8">
          <h2 className="text-lg font-medium text-primary mb-4">Administrators</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-glass">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase">Username</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase">Email</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-glass">
                {dashboardData.admins.map((admin, index) => (
                  <tr key={index} className="hover:bg-accent/10">
                    <td className="px-6 py-4 text-sm text-foreground">{admin.name}</td>
                    <td className="px-6 py-4 text-sm text-foreground">{admin.username}</td>
                    <td className="px-6 py-4 text-sm text-foreground">{admin.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {isMasterAdmin && (
          <div className="bg-card p-6 rounded-lg shadow glass-effect">
            <h2 className="text-lg font-medium text-primary mb-4">Pending Registrations</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-glass">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase">Username</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase">Purpose</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase">CV</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-glass">
                  {dashboardData.registers.map((reg) => (
                    <tr key={reg.id} className="hover:bg-accent/10">
                      <td className="px-6 py-4 text-sm text-foreground">{reg.name}</td>
                      <td className="px-6 py-4 text-sm text-foreground">{reg.username}</td>
                      <td className="px-6 py-4 text-sm text-foreground">{reg.email}</td>
                      <td className="px-6 py-4 text-sm text-foreground">{reg.purpose || "N/A"}</td>
                      <td className="px-6 py-4 text-sm">
                        <a href={reg.cvUrl} target="_blank" className="text-primary hover:underline">View CV</a>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <button
                          onClick={() => handleApprove(reg.id)}
                          className="px-3 py-1 bg-success text-white rounded-md hover:bg-success/90 mr-2"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => toast.error("Rejection not implemented yet")}
                          className="px-3 py-1 bg-destructive text-white rounded-md hover:bg-destructive/90"
                        >
                          Reject
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}