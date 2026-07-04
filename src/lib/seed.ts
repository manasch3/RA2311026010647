import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.create({
    data: {
      name: 'Acme Corp',
      users: {
        create: {
          email: 'admin@acme.com',
          name: 'Admin User',
        },
      },
      projects: {
        create: {
          name: 'Default Project',
          queues: {
            create: {
              name: 'default',
              concurrencyLimit: 5,
            },
          },
        },
      },
    },
    include: {
      projects: {
        include: { queues: true },
      },
    },
  });

  console.log('Seed completed:', org);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
