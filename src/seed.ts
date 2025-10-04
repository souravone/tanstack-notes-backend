import { PrismaClient } from "@prisma/client";
import { auth } from "./lib/auth";

const prisma = new PrismaClient();
async function seed() {
  try {
    const existingAdmin = await prisma.user.findFirst({
      where: { role: "ADMIN" },
    });
    if (!existingAdmin) {
      await auth.api.createUser({
        body: {
          email: "sourav@mail.com",
          password: "souravdas",
          name: "Sourav Das",
          // put role inside `data` if your auth config maps extra user fields that way
          data: { role: "ADMIN" },
        },
      });
      console.log("✅ Created users via Better Auth API");
    } else {
      console.log("❌ Admin already exists");
    }
    // Admin
  } catch (err) {
    console.error("Seed error:", err);
    process.exit(1);
  }
}

seed().then(() => process.exit(0));
