import Image from "next/image";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function SharedMaterialPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const share = await prisma.sharedMaterial.findFirst({
    where: {
      shareToken: token,
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    include: { material: true },
  });
  if (!share) notFound();

  const material = share.material;
  const resource = material.cloudinaryPublicId ? `/api/vault/shared/${token}` : material.url;
  return <main className="landing-shell"><article className="glass-panel w-[min(100%-32px,720px)] p-6 sm:p-8"><p className="eyebrow text-cyan-300">Shared Learning Vault material</p><h1 className="mt-3 text-2xl font-medium text-white">{material.title}</h1>{material.description && <p className="mt-2 text-sm leading-6 text-slate-400">{material.description}</p>}<div className="mt-6">{material.kind === "note" ? <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-lg bg-black/20 p-4 text-sm leading-6 text-slate-300">{material.content}</pre> : material.mimeType?.startsWith("image/") && resource ? <Image src={resource} alt={material.title} width={1200} height={800} unoptimized className="max-h-[60vh] w-full rounded-lg object-contain" /> : material.mimeType === "application/pdf" && resource ? <iframe src={resource} title={material.title} className="h-[60vh] w-full rounded-lg" /> : resource ? <a href={resource} target="_blank" rel="noreferrer" className="primary-button"><span>Open shared resource</span></a> : <p className="text-sm text-slate-500">This material has no preview.</p>}</div>{resource && <a href={resource} download target="_blank" rel="noreferrer" className="mt-5 inline-flex text-xs text-cyan-300">Download material</a>}<p className="mt-8 text-xs text-slate-600">Shared from LifeForge Learning Vault</p></article></main>;
}
