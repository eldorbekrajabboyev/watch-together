import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash('admin123', 10);
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@syncwatch.local' },
    update: {},
    create: {
      nickname: 'Admin',
      email: 'admin@syncwatch.local',
      passwordHash: adminPassword,
      isAdmin: true,
    },
  });

  console.log('Seed complete:', { admin: admin.nickname });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
