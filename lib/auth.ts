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

        // Staff login: email → admin; personalId → manager / accountant
        if (userType === "ADMIN") {
          const email = credentials.email?.trim();
          const personalId = credentials.personalId?.trim();

          if (email) {
            const user = await prisma.user.findUnique({
              where: { email },
            });

            if (!user) {
              throw new Error("ელფოსტა ან პაროლი არასწორია");
            }

            if (user.role !== "ADMIN") {
              throw new Error("ელფოსტა ან პაროლი არასწორია");
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
              mustChangePassword: user.mustChangePassword,
            };
          }

          if (personalId) {
            const employee = await prisma.employee.findFirst({
              where: {
                personalId,
                canLogin: true,
                position: {
                  in: ["MANAGER", "MANAGER_ASSISTANT", "ACCOUNTANT"],
                },
              },
            });

            if (!employee?.email) {
              throw new Error("პირადი ნომერი ან პაროლი არასწორია");
            }

            const user = await prisma.user.findUnique({
              where: { email: employee.email },
            });

            if (!user) {
              throw new Error("პირადი ნომერი ან პაროლი არასწორია");
            }

            const staffRoles = ["MANAGER", "MANAGER_ASSISTANT", "ACCOUNTANT"];
            if (!staffRoles.includes(user.role)) {
              throw new Error("პირადი ნომერი ან პაროლი არასწორია");
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
              mustChangePassword: user.mustChangePassword,
            };
          }

          throw new Error("გთხოვთ შეიყვანოთ ელფოსტა ან პირადი ნომერი");
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
            mustChangePassword: hotel.user.mustChangePassword,
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
            mustChangePassword: hotel.user.mustChangePassword,
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
        (token as any).id = (user as any).id;
        if (!token.sub) {
          token.sub = (user as any).id;
        }
        (token as any).role = (user as any).role;
        (token as any).mustChangePassword =
          (user as any).mustChangePassword ?? false;
      } else {
        // Subsequent requests: keep claim in sync with DB (e.g. after change-password)
        const userId = ((token as any).id ?? token.sub) as string | undefined;
        if (userId) {
          const dbUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { mustChangePassword: true, role: true },
          });
          if (dbUser) {
            (token as any).mustChangePassword = dbUser.mustChangePassword;
            (token as any).role = dbUser.role;
          }
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).mustChangePassword =
          (token as any).mustChangePassword ?? false;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

