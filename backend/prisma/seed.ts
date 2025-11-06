import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcrypt";
import { env } from "@config/index.js";

const prisma = new PrismaClient();

async function main() {
  const existingAdmin = await prisma.user.findUnique({ where: { email: env.ADMIN_DEFAULT_EMAIL } });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(env.ADMIN_DEFAULT_PASSWORD, 12);
    await prisma.user.create({
      data: {
        email: env.ADMIN_DEFAULT_EMAIL,
        passwordHash,
        role: Role.ADMIN,
        username: "admin",
        balances: {
          create: {},
        },
      },
    });
    console.log("Seeded default admin user");
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
