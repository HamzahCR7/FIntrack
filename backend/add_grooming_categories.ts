import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addSelfGroomingCategories() {
  console.log('Adding Self Grooming category and subcategories...');

  // 1. Create or upsert parent category
  const parent = await prisma.category.upsert({
    where: { name: 'Self Grooming' },
    update: {
      icon: 'scissors',
      color: '#EC4899',
      isSystem: true,
      parentId: null,
    },
    create: {
      name: 'Self Grooming',
      icon: 'scissors',
      color: '#EC4899',
      isSystem: true,
      parentId: null,
    },
  });

  console.log('Self Grooming parent category ID:', parent.id);

  // 2. Subcategories
  const subcategories = [
    { name: 'Self Grooming > Shavings', icon: 'scissors', color: '#06B6D4' },
    { name: 'Self Grooming > Hair Cut', icon: 'scissors', color: '#8B5CF6' },
    { name: 'Self Grooming > De-tan', icon: 'sparkles', color: '#F59E0B' },
    { name: 'Self Grooming > Facial & Cleanup', icon: 'sparkles', color: '#EC4899' },
    { name: 'Self Grooming > Head Massage', icon: 'smile', color: '#10B981' },
    { name: 'Self Grooming > Beard Grooming', icon: 'scissors', color: '#3B82F6' },
    { name: 'Self Grooming > Salon & Spa', icon: 'sparkles', color: '#A855F7' },
  ];

  for (const sub of subcategories) {
    const created = await prisma.category.upsert({
      where: { name: sub.name },
      update: {
        parentId: parent.id,
        icon: sub.icon,
        color: sub.color,
      },
      create: {
        name: sub.name,
        icon: sub.icon,
        color: sub.color,
        parentId: parent.id,
        isSystem: true,
      },
    });
    console.log(`Created/updated subcategory: ${created.name} (${created.id})`);
  }

  // Also check if existing "Shaving, hair cutting and de-tanned" transaction exists and update its category if needed
  const groomTx = await prisma.transaction.findFirst({
    where: {
      description: {
        contains: 'Shaving, hair cutting',
      },
    },
  });

  if (groomTx) {
    await prisma.transaction.update({
      where: { id: groomTx.id },
      data: {
        categoryId: parent.id,
      },
    });
    console.log(`Updated past transaction (${groomTx.id}) to Self Grooming category.`);
  }

  console.log('Done!');
}

addSelfGroomingCategories()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
