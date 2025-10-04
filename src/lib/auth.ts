import { betterAuth } from "better-auth";
import { createAuthClient } from "better-auth/client";
import { adminClient } from "better-auth/client/plugins";
import { admin } from "better-auth/plugins";
import { openAPI } from "better-auth/plugins";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const auth = betterAuth({
  plugins: [openAPI(), admin()],
  database: prismaAdapter(prisma, {
    provider: "mongodb",
  }),
  trustedOrigins: ["http://localhost:3000"],

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 6,
    autoSignIn: true,
  },
});

export const authClient = createAuthClient({
  plugins: [adminClient()],
});
