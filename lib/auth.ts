import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "./prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        personalId: { label: "Personal ID", type: "text" },
        identificationCode: { label: "Identification Code", type: "text" },
        userType: { label: "User Type", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.password) {
          throw new Error("გთხოვთ შეიყვანოთ პაროლი");
        }

        const userType = credentials.userType as "ADMIN" | "PHYSICAL" | "LEGAL";

        // Admin login - email and password
        if (userType === "ADMIN") {
          if (!credentials?.email) {
            throw new Error("გთხოვთ შეიყვანოთ ელფოსტა");
          }

          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          });

          if (!user) {
            throw new Error("ელფოსტა ან პაროლი არასწორია");
          }

          // Check if user is admin
          if (user.role !== "ADMIN") {
            throw new Error("ეს ანგარიში არ არის ადმინისტრატორის ანგარიში");
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!isPasswordValid) {
            throw new Error("ელფოსტა ან პაროლი არასწორია");
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          };
        }

        // Physical person login - personalId and password
        if (userType === "PHYSICAL") {
          if (!credentials?.personalId) {
            throw new Error("გთხოვთ შეიყვანოთ პირადი ნომერი");
          }

          const hotel = await prisma.hotel.findFirst({
            where: {
              personalId: credentials.personalId,
              type: "PHYSICAL",
            },
            include: {
              user: true,
            },
          });

          if (!hotel || !hotel.user) {
            throw new Error("პირადი ნომერი ან პაროლი არასწორია");
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            hotel.user.password
          );

          if (!isPasswordValid) {
            throw new Error("პირადი ნომერი ან პაროლი არასწორია");
          }

          return {
            id: hotel.user.id,
            email: hotel.user.email,
            name: hotel.user.name,
            role: hotel.user.role,
          };
        }

        // Legal entity login - identificationCode and password
        if (userType === "LEGAL") {
          if (!credentials?.identificationCode) {
            throw new Error("გთხოვთ შეიყვანოთ საიდენტიფიკაციო კოდი");
          }

          const hotel = await prisma.hotel.findFirst({
            where: {
              identificationCode: credentials.identificationCode,
              type: "LEGAL",
            },
            include: {
              user: true,
            },
          });

          if (!hotel || !hotel.user) {
            throw new Error("საიდენტიფიკაციო კოდი ან პაროლი არასწორია");
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            hotel.user.password
          );

          if (!isPasswordValid) {
            throw new Error("საიდენტიფიკაციო კოდი ან პაროლი არასწორია");
          }

          return {
            id: hotel.user.id,
            email: hotel.user.email,
            name: hotel.user.name,
            role: hotel.user.role,
          };
        }

        throw new Error("გთხოვთ აირჩიოთ შესვლის ტიპი");
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    signOut: "/",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

