import Google from "@auth/core/providers/google";
import { Session } from "@nestjs/common";
import { profile } from "console";
import NextAuth from "next-auth";
import { signInSchema } from "../auth/zod";
import { ZodError } from "zod";
import Credentials from "next-auth/providers/credentials";
import { saltAndHashPassword } from "../auth/saltAndHashPassword";
import Passkey from "next-auth/providers/passkey"
import { PrismaAdapter } from "@auth/prisma-adapter" //Instal Prisma
import { PrismaClient } from "@prisma/client" //Instal Primsa Client

const prisma = new PrismaClient()
 
export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  experimental: { enableWebAuthn: true },
  providers: [
    Credentials({
        credentials: {
          email: {},
          password: {},
        },
        authorize: async (credentials) => {
          let user = null

          const { email, password } = await signInSchema.parseAsync(credentials)
   
          const pwHash = saltAndHashPassword(credentials.password)
   
          user = await getUserFromDb(credentials.email, pwHash)
   
          if (!user) {
            throw new Error("User not found.")
          }
          return user
        },
      }),
    Google({
        profile(profile){
            console.log("Profile Google: ", profile);

            return {
                ...profile,
                id: profile.sub,
                role: userRole,
            };
        },
        clientId: process.env.GOOGLE_ID,
        clientSecret: process.env.GOOGLE_Secret,
    }),
    Passkey,
  ],
  callbacks: {
    async jwt({ token, user }) {
        if (user) token.role = user.role;
        return token; 
    }
    async session({ session, token }) {
        if (session?.user) session.user.role = token.role;
        return session;
    },
  },
});