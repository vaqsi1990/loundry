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
        adminRole: { label: "Admin Role", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.password) {
          throw new Error("გთხოვთ შეიყვანოთ პაროლი");
        }

        const userType = credentials.userType as "ADMIN" | "PHYSICAL" | "LEGAL";

        // Admin/Manager login
        if (userType === "ADMIN") {
          const adminRole = credentials.adminRole as "ADMIN" | "MANAGER" | undefined;

          // Manager login with personalId
          if (adminRole === "MANAGER" && credentials?.personalId) {
            if (!credentials.personalId) {
              throw new Error("გთხოვთ შეიყვანოთ პირადი ნომერი");
            }

            // Find employee by personalId
            const employee = await prisma.employee.findFirst({
              where: {
                personalId: credentials.personalId,
                canLogin: true,
                position: {
                  in: ["MANAGER", "MANAGER_ASSISTANT"],
                },
              },
            });

            if (!employee || !employee.email) {
              throw new Error("პირადი ნომერი ან პაროლი არასწორია");
            }

            // Find user by employee email
            const user = await prisma.user.findUnique({
              where: { email: employee.email },
            });

            if (!user) {
              throw new Error("პირადი ნომერი ან პაროლი არასწორია");
            }

            // Check if user role matches manager or manager assistant
            if (user.role !== "MANAGER" && user.role !== "MANAGER_ASSISTANT") {
              throw new Error("ეს ანგარიში არ არის მენეჯერის ან მენეჯერის თანაშემწის ანგარიში");
            }

            const isPasswordValid = await bcrypt.compare(
              credentials.password,
              user.password
            );

            if (!isPasswordValid) {
              throw new Error("პირადი ნომერი ან პაროლი არასწორია");
            }

            return {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
            };
          }

          // Admin login with email
          if (!credentials?.email) {
            throw new Error("გთხოვთ შეიყვანოთ ელფოსტა");
          }

          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          });

          if (!user) {
            throw new Error("ელფოსტა ან პაროლი არასწორია");
          }

          // Check role based on selected adminRole
          if (adminRole === "ADMIN") {
            if (user.role !== "ADMIN") {
              throw new Error("ეს ანგარიში არ არის ადმინისტრატორის ანგარიში");
            }
          } else if (adminRole === "MANAGER") {
            if (user.role !== "MANAGER" && user.role !== "MANAGER_ASSISTANT") {
              throw new Error("ეს ანგარიში არ არის მენეჯერის ან მენეჯერის თანაშემწის ანგარიში");
            }
          } else {
            // If no adminRole specified, allow ADMIN, MANAGER, or MANAGER_ASSISTANT
            if (user.role !== "ADMIN" && user.role !== "MANAGER" && user.role !== "MANAGER_ASSISTANT") {
              throw new Error("ელფოსტა ან პაროლი არასწორია");
            }
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

          const trimmedPersonalId = credentials.personalId.trim();

          if (!trimmedPersonalId) {
            throw new Error("გთხოვთ შეიყვანოთ პირადი ნომერი");
          }

          // Find hotel by personalId (trimmed)
          const hotel = await prisma.hotel.findFirst({
            where: {
              personalId: trimmedPersonalId,
              type: "PHYSICAL",
            },
            include: {
              user: true,
            },
          });

          if (!hotel) {
            throw new Error("პირადი ნომერი ან პაროლი არასწორია");
          }

          if (!hotel.user) {
            throw new Error("სასტუმროსთვის ანგარიში არ არის დარეგისტრირებული");
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

          const trimmedIdentificationCode = credentials.identificationCode.trim();

          if (!trimmedIdentificationCode) {
            throw new Error("გთხოვთ შეიყვანოთ საიდენტიფიკაციო კოდი");
          }

          // Find hotel by identificationCode (trimmed)
          const hotel = await prisma.hotel.findFirst({
            where: {
              identificationCode: trimmedIdentificationCode,
              type: "LEGAL",
            },
            include: {
              user: true,
            },
          });

          if (!hotel) {
            throw new Error("საიდენტიფიკაციო კოდი ან პაროლი არასწორია");
          }

          if (!hotel.user) {
            throw new Error("სასტუმროსთვის ანგარიში არ არის დარეგისტრირებული");
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

