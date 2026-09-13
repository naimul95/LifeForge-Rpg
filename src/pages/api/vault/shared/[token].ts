import type { NextApiRequest, NextApiResponse } from "next";

import { prisma } from "@/lib/db";
import { cloudinary } from "@/lib/storage/cloudinary";

function getAuthenticatedDownloadUrl(publicId: string, material: { mimeType: string | null; fileName: string | null; cloudinaryResourceType: string | null }) {
  const resourceType = material.cloudinaryResourceType === "image" || material.cloudinaryResourceType === "raw" || material.cloudinaryResourceType === "video" ? material.cloudinaryResourceType : "image";
  const format = material.mimeType?.split("/")[1] ?? material.fileName?.split(".").pop() ?? "pdf";
  return cloudinary.utils.private_download_url(publicId, format, { type: "authenticated", resource_type: resourceType });
}

export default async function sharedMaterial(request: NextApiRequest, response: NextApiResponse) {
  if (request.method !== "GET") { response.setHeader("Allow", "GET"); response.status(405).end("Method Not Allowed"); return; }
  try {
    const token = typeof request.query.token === "string" ? request.query.token : "";
    const share = await prisma.sharedMaterial.findFirst({ where: { shareToken: token, revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }, include: { material: true } });
    if (!share?.material.cloudinaryPublicId) { response.status(404).end("Shared material not found."); return; }
    const signedUrl = getAuthenticatedDownloadUrl(share.material.cloudinaryPublicId, share.material);
    const upstream = await fetch(signedUrl, { cache: "no-store" });
    if (!upstream.ok) { response.status(502).end("Shared material unavailable."); return; }
    const body = Buffer.from(await upstream.arrayBuffer());
    response.setHeader("Content-Type", share.material.mimeType ?? upstream.headers.get("content-type") ?? "application/octet-stream");
    response.setHeader("Content-Length", body.length);
    response.setHeader("Cache-Control", "private, no-store");
    response.status(200).send(body);
  } catch { response.status(404).end("Shared material unavailable."); }
}