import { PrismaClient } from '@prisma/client';

const CATEGORY_TREE = [
  {
    name: 'Teknoloji',
    slug: 'teknoloji',
    children: [
      {
        name: 'Yapay Zeka',
        slug: 'yapay-zeka',
        interests: ['Makine Ogrenmesi', 'LLM', 'Veri Bilimi'],
      },
      {
        name: 'Siber Guvenlik',
        slug: 'siber-guvenlik',
        interests: ['Blue Team', 'Red Team', 'Cloud Security'],
      },
    ],
  },
  {
    name: 'Girisimcilik',
    slug: 'girisimcilik',
    children: [
      {
        name: 'Startup',
        slug: 'startup',
        interests: ['MVP', 'Growth', 'Yatirim'],
      },
      {
        name: 'Kariyer',
        slug: 'kariyer',
        interests: ['Mentorluk', 'Networking', 'Mulakat'],
      },
    ],
  },
  {
    name: 'Tasarim',
    slug: 'tasarim',
    children: [
      {
        name: 'UI UX',
        slug: 'ui-ux',
        interests: ['Figma', 'Design Systems', 'Research'],
      },
    ],
  },
  {
    name: 'Yasam',
    slug: 'yasam',
    children: [
      {
        name: 'Spor',
        slug: 'spor',
        interests: ['Kosu', 'Yoga', 'Outdoor'],
      },
    ],
  },
];

export class CategorySeeder {
  static async seed(prisma: PrismaClient): Promise<void> {
    console.log('🗂️ Creating categories and interests...');

    for (const [index, rootCategory] of CATEGORY_TREE.entries()) {
      const root = await prisma.category.upsert({
        where: { slug: rootCategory.slug },
        update: {
          name: rootCategory.name,
          sortOrder: index,
          status: 'ACTIVE',
        },
        create: {
          name: rootCategory.name,
          slug: rootCategory.slug,
          sortOrder: index,
          status: 'ACTIVE',
        },
      });

      for (const [childIndex, childCategory] of rootCategory.children.entries()) {
        const child = await prisma.category.upsert({
          where: { slug: childCategory.slug },
          update: {
            name: childCategory.name,
            parentID: root.id,
            sortOrder: childIndex,
            status: 'ACTIVE',
          },
          create: {
            name: childCategory.name,
            slug: childCategory.slug,
            parentID: root.id,
            sortOrder: childIndex,
            status: 'ACTIVE',
          },
        });

        for (const interestName of childCategory.interests) {
          const interestSlug = `${childCategory.slug}-${interestName}`
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');

          await prisma.interest.upsert({
            where: { slug: interestSlug },
            update: {
              name: interestName,
              categoryID: child.id,
            },
            create: {
              name: interestName,
              slug: interestSlug,
              categoryID: child.id,
            },
          });
        }
      }
    }

    console.log('✓ Categories and interests created/updated\n');
  }
}
