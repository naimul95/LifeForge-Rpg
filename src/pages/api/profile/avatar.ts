import Busboy from "busboy";
import type { NextApiRequest, NextApiResponse } from "next";

import { updateProfileAvatarForUser } from "@/actions/profile.actions";
import { sessionFromCookieHeader } from "@/lib/auth/session";
import { cloudinary } from "@/lib/storage/cloudinary";
import { detectProfileImageMimeType } from "@/lib/storage/image-validation";

export const config = { api: { bodyParser: false } };
const MAX_FILE_SIZE = 5_000_000;

function parseAvatar(request: NextApiRequest) {
  return new Promise<{ name: string; type: string; buffer: Buffer }>((resolve, reject) => {
    const parser = Busboy({ headers: request.headers, limits: { fileSize: MAX_FILE_SIZE, files: 1 } }); let value: { name: string; type: string; buffer: Buffer } | undefined; let rejected = false;
    parser.on("file", (field, stream, info) => { if (field !== "avatar") { stream.resume(); return; } const chunks: Buffer[] = []; stream.on("data", (chunk: Buffer) => chunks.push(chunk)); stream.on("limit", () => { rejected = true; reject(new Error("Profile images must be 5 MB or smaller.")); }); stream.on("end", () => { if (!rejected) value = { name: info.filename, type: info.mimeType, buffer: Buffer.concat(chunks) }; }); }); parser.on("error", reject); parser.on("finish", () => { if (!rejected && value) resolve(value); else if (!rejected) reject(new Error("An avatar image is required.")); }); request.pipe(parser);
  });
}
function uploadAvatar(buffer: Buffer, userId: string, name: string) { return new Promise<{ publicId: string; secureUrl: string }>((resolve, reject) => { const stream = cloudinary.uploader.upload_stream({ folder: `lifeforge/avatars/${userId}`, type: "authenticated", resource_type: "image", transformation: [{ width: 512, height: 512, crop: "fill", gravity: "face" }], context: { original_name: name } }, (error, result) => { if (error || !result) reject(error ?? new Error("Cloudinary avatar upload failed.")); else resolve({ publicId: result.public_id, secureUrl: result.secure_url }); }); stream.end(buffer); }); }

export default async function avatar(request: NextApiRequest, response: NextApiResponse) {
  if (request.method !== "POST") { response.setHeader("Allow", "POST"); response.status(405).end("Method Not Allowed"); return; }
  try {
    const session = await sessionFromCookieHeader(request.headers.cookie);
    if (!session) throw new Error("Unauthorized.");
    const userId = session.userId;
    const file = await parseAvatar(request);
    if (!detectProfileImageMimeType(file.buffer)) throw new Error("Please select a JPG, JPEG, PNG, WEBP, or GIF image.");
    const uploaded = await uploadAvatar(file.buffer, userId, file.name);
    try {
      const previousId = await updateProfileAvatarForUser(userId, uploaded);
      if (previousId && previousId.startsWith(`lifeforge/avatars/${userId}/`)) await cloudinary.uploader.destroy(previousId, { resource_type: "image", invalidate: true });
    } catch (error) {
      await cloudinary.uploader.destroy(uploaded.publicId, { resource_type: "image", invalidate: true });
      throw error;
    }
    response.status(201).json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const userMessage = message === "Please select a JPG, JPEG, PNG, WEBP, or GIF image."
      ? message
      : message === "Profile images must be 5 MB or smaller."
        ? message
        : "Profile picture upload failed. Please try again.";
    response.status(400).json({ error: userMessage });
  }
}
