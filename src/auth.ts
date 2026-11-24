import NextAuth, { type DefaultSession } from "next-auth";
import Nodemailer from "next-auth/providers/nodemailer";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/db";

declare module "next-auth" {
  interface Session {
    user: { id: string; role: Role } & DefaultSession["user"];
  }
}

// Login med engangslink på mail – ingen adgangskoder at glemme eller lække.
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Nodemailer({
      server: process.env.EMAIL_SERVER,
      from: process.env.EMAIL_FROM,
    }),
  ],
  session: { strategy: "database" },
  pages: { signIn: "/login", verifyRequest: "/login/tjek-mail" },
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      session.user.role = (user as unknown as { role: Role }).role;
      return session;
    },
  },
});

export async function requireUser(callbackUrl = "/min-side") {
  const session = await auth();
  if (!session?.user) redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  return session.user;
}

export async function requireAdmin() {
  const user = await requireUser("/admin");
  if (user.role !== "ADMIN") redirect("/min-side");
  return user;
}
