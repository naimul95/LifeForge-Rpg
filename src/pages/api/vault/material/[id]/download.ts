import type { NextApiRequest, NextApiResponse } from "next";

import { prisma } from "@/lib/db";
import { sessionFromCookieHeader } from "@/lib/auth/session";
import { cloudinary } from "@/lib/storage/cloudinary";

function getAuthenticatedDownloadUrl(publicId: string, material: { mimeType: string | null; fileName: string | null; cloudinaryResourceType: string | null }) {
  const resourceType = material.cloudinaryResourceType === "image" || material.cloudinaryResourceType === "raw" || material.cloudinaryResourceType === "video" ? material.cloudinaryResourceType : "image";
  const format = material.mimeType?.split("/")[1] ?? material.fileName?.split(".").pop() ?? "pdf";
  return cloudinary.utils.private_download_url(publicId, format, { type: "authenticated", resource_type: resourceType });
}

export default async function download(request: NextApiRequest, response: NextApiResponse) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    response.status(405).end("Method Not Allowed");
    return;
  }
  try {
    const session = await sessionFromCookieHeader(request.headers.cookie);
    if (!session) throw new Error("Unauthorized.");
    const userId = session.userId;
    const materialId = typeof request.query.id === "string" ? request.query.id : "";
    const material = await prisma.material.findFirst({ where: { id: materialId, userId }, select: { cloudinaryPublicId: true, cloudinaryResourceType: true, mimeType: true, fileName: true } });
    if (!material?.cloudinaryPublicId) { response.status(404).end("Material not found."); return; }
    const signedUrl = getAuthenticatedDownloadUrl(material.cloudinaryPublicId, material);
    const upstream = await fetch(signedUrl, { cache: "no-store" });
    if (!upstream.ok) { response.status(502).end("Download unavailable."); return; }
    const body = Buffer.from(await upstream.arrayBuffer());
    const name = (material.fileName ?? "lifeforge-material").replace(/[\r\n"\\]/g, "_");
    response.setHeader("Content-Type", material.mimeType ?? upstream.headers.get("content-type") ?? "application/octet-stream");
    response.setHeader("Content-Length", body.length);
    response.setHeader("Content-Disposition", `attachment; filename="${name}"`);
    response.setHeader("Cache-Control", "private, no-store");
    response.status(200).send(body);
  } catch {
    response.status(401).json({ error: "Unauthorized" });
  }
}
