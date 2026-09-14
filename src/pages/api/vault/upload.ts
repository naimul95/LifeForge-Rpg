import Busboy from "busboy";
import type { NextApiRequest, NextApiResponse } from "next";

import { createUploadedMaterialForUser } from "@/actions/vault.actions";
import { sessionFromCookieHeader } from "@/lib/auth/session";
import { cloudinary } from "@/lib/storage/cloudinary";
import { detectImageMimeType, getUploadType } from "@/lib/storage/image-validation";

export const config = { api: { bodyParser: false } };
const MAX_FILE_SIZE = 10_000_000;

type UploadPayload = {
  fields: Record<string, string>;
  file: { name: string; type: string; buffer: Buffer };
};

function hasValidSignature(file: UploadPayload["file"], uploadType: string) {
  const header = file.buffer.subarray(0, 12);
  if (detectImageMimeType(file.buffer)) return true;
  if (uploadType === "application/pdf") return header.subarray(0, 5).toString() === "%PDF-";
  if (uploadType === "text/plain" || uploadType === "text/csv") return true;
  return header[0] === 0x50 && header[1] === 0x4b && header[2] === 0x03 && header[3] === 0x04;
}

function parseUpload(request: NextApiRequest): Promise<UploadPayload> {
  return new Promise((resolve, reject) => {
    const fields: Record<string, string> = {};
    let uploadedFile: UploadPayload["file"] | undefined;
    let rejected = false;
    const parser = Busboy({ headers: request.headers, limits: { fileSize: MAX_FILE_SIZE, files: 1 } });
    parser.on("field", (name, value) => { fields[name] = value; });
    parser.on("file", (name, stream, info) => {
      if (name !== "file") { stream.resume(); return; }
      const chunks: Buffer[] = [];
      stream.on("data", (chunk: Buffer) => chunks.push(chunk));
      stream.on("limit", () => { rejected = true; reject(new Error("Files must be 10 MB or smaller.")); });
      stream.on("end", () => { if (!rejected) uploadedFile = { name: info.filename, type: info.mimeType, buffer: Buffer.concat(chunks) }; });
    });
    parser.on("error", reject);
    parser.on("finish", () => {
      if (rejected) return;
      if (!uploadedFile) { reject(new Error("A file is required.")); return; }
      resolve({ fields, file: uploadedFile });
    });
    request.pipe(parser);
  });
}

function uploadBuffer(buffer: Buffer, userId: string, fileName: string) {
  return new Promise<{ publicId: string; secureUrl: string; resourceType: "image" | "raw" | "video" }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder: `lifeforge/${userId}`, type: "authenticated", resource_type: "auto", context: { original_name: fileName } }, (error, result) => {
      if (error || !result) reject(error ?? new Error("Cloudinary upload failed."));
      else resolve({ publicId: result.public_id, secureUrl: result.secure_url, resourceType: result.resource_type as "image" | "raw" | "video" });
    });
    stream.end(buffer);
  });
}

export default async function upload(request: NextApiRequest, response: NextApiResponse) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    response.status(405).end("Method Not Allowed");
    return;
  }
  try {
    const session = await sessionFromCookieHeader(request.headers.cookie);
    if (!session) throw new Error("Unauthorized.");
    const userId = session.userId;
    const { fields, file } = await parseUpload(request);
    if (!fields.topicId) throw new Error("A topic is required.");
    const requestedFileKind = fields.fileKind;
    const documentTypes = new Set(["application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "text/plain", "text/csv"]);
    const uploadType = getUploadType(file.type, file.buffer);
    if (!hasValidSignature(file, uploadType)) throw new Error("The uploaded file type does not match its contents.");
    if (uploadType.startsWith("image/") && !detectImageMimeType(file.buffer)) throw new Error("Unsupported image format. Please use JPG, PNG, WEBP, GIF, HEIC, or HEIF.");
    const fileKind = uploadType === "application/pdf" ? "pdf" : uploadType.startsWith("image/") && requestedFileKind === "handwritten_note" ? "handwritten_note" : uploadType.startsWith("image/") ? "image" : documentTypes.has(uploadType) ? "document" : null;
    if (!fileKind) throw new Error("Only images, PDFs, and common document files are supported.");
    const uploaded = await uploadBuffer(file.buffer, userId, file.name);
    try {
      const material = await createUploadedMaterialForUser(userId, { topicId: fields.topicId, title: fields.title || file.name, description: fields.description || "", fileKind, fileName: file.name, mimeType: uploadType, sizeBytes: file.buffer.length, cloudinaryPublicId: uploaded.publicId, cloudinaryUrl: uploaded.secureUrl, cloudinaryResourceType: uploaded.resourceType });
      response.status(201).json({ ok: true, material });
      return;
    } catch (error) {
      await cloudinary.uploader.destroy(uploaded.publicId, { resource_type: uploaded.resourceType, invalidate: true });
      throw error;
    }
  } catch (error) {
    response.status(400).json({ error: error instanceof Error ? error.message : "Upload failed." });
  }
}
