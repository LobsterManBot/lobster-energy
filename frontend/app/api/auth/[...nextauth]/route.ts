import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';

// Simple in-memory user store (replace with DB later)
const users: { email: string; password: string; name: string }[] = [];

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Email',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        
        // Check existing user
        const user = users.find(u => u.email === credentials.email);
        if (user && user.password === credentials.password) {
          return { id: user.email, email: user.email, name: user.name };
        }
        
        return null;
      }
    }),
    // Add Google later with env vars
    // GoogleProvider({
    //   clientId: process.env.GOOGLE_CLIENT_ID!,
    //   clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    // }),
  ],
  pages: {
    signIn: '/login',
    newUser: '/signup',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET || 'lobster-energy-secret-key-change-in-prod',
});

export { handler as GET, handler as POST };
