import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { SupabaseAdapter } from "@auth/supabase-adapter";

export const authOptions = {
    adapter: SupabaseAdapter({
        url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
        secret: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    }),

    providers: [
        CredentialsProvider({
            name: "MagicLink",
            credentials: {},
            async authorize(credentials: any) {
                const email = credentials?.email;
                if (!email || typeof email !== "string") return null;
                return { id: email, email };
            }
            ,
        }),

    ],

    pages: {
        signIn: "/login",
    },

    session: {
        strategy: "jwt",
    } as const,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
