// next-auth.d.ts
import NextAuth, { DefaultSession, DefaultUser } from "next-auth";

// Extend the NextAuth types to include custom fields
declare module "next-auth" {
  interface User {
    id: string;
    username: string;
    role: string;
  }

  interface Session extends DefaultSession {
    user: {
      id: string;
      username: string;
      role: string;
    } & DefaultSession["user"];
  }
}
