import fs from 'node:fs';
const envText = fs.readFileSync('.env', 'utf8');
for (const line of envText.split(/\r?\n/)) {
  const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  if (match) process.env[match[1]] = match[2].replace(/^"|"$/g, '');
}
const { PrismaClient } = await import('./src/generated/prisma/client.ts');
const prisma = new PrismaClient();
try {
  const materials = await prisma.material.findMany({
    take: 20,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      userId: true,
      topicId: true,
      kind: true,
      fileKind: true,
      title: true,
      mimeType: true,
      url: true,
      fileName: true,
      cloudinaryPublicId: true,
      cloudinaryUrl: true,
      cloudinaryResourceType: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  console.log(JSON.stringify(materials, null, 2));
} finally {
  await prisma.$disconnect();
}
