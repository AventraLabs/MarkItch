import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { verifyPassword } from "@/lib/password";
import { LoginSchema } from "@/lib/validation";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-Mail", type: "email" },
        password: { label: "Passwort", type: "password" },
      },
      authorize: async (rawCredentials) => {
        const parsed = LoginSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
        if (!user) return null;

        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) return null;

        // Phase 24: a banned account can't log back in — the generic
        // "E-Mail oder Passwort ist falsch" message loginUser shows for any
        // authorize() failure covers this too, deliberately (no need to
        // reveal ban status to someone who no longer has a session).
        if (user.bannedAt) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          isVerified: user.emailVerifiedAt !== null,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.isVerified = user.isVerified;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.isVerified = token.isVerified as boolean;
      }
      return session;
    },
  },
});
