import { randomUUID } from "node:crypto";
import path from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import {
  ensureStorageReady,
  getUploadsDirectory,
} from "@/src/lib/server/store";

function getSafeFileExtension(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  if (!ext) {
    return ".bin";
  }

  return ext.replace(/[^a-z0-9.]/g, "") || ".bin";
}

function createFileName(originalName: string): string {
  const extension = getSafeFileExtension(originalName);
  return `${Date.now()}-${randomUUID()}${extension}`;
}

function sanitizeUploadFileName(input: string): string {
  return path.basename(input).replace(/[^a-zA-Z0-9._-]/g, "");
}

function extractUploadFileName(imageUrl: string): string {
  const trimmed = imageUrl.trim();
  if (!trimmed) {
    return "";
  }

  const directUploadsMatch = trimmed.match(/^\/uploads\/([^/?#]+)$/i);
  if (directUploadsMatch) {
    return sanitizeUploadFileName(directUploadsMatch[1] ?? "");
  }

  const legacyApiMatch = trimmed.match(/^\/api\/uploads\/([^/?#]+)$/i);
  if (legacyApiMatch) {
    return sanitizeUploadFileName(legacyApiMatch[1] ?? "");
  }

  return "";
}

function contentTypeForExtension(extension: string): string {
  const ext = extension.toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  if (ext === ".svg") return "image/svg+xml";
  return "application/octet-stream";
}

export async function saveUploadedFiles(files: File[]): Promise<string[]> {
  await ensureStorageReady();
  const uploadDir = getUploadsDirectory();
  const uploadedUrls: string[] = [];

  for (const file of files) {
    const fileName = createFileName(file.name);
    const outputPath = path.join(uploadDir, fileName);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(outputPath, buffer);
    uploadedUrls.push(`/uploads/${fileName}`);
  }

  return uploadedUrls;
}

export async function readStoredUpload(imageUrl: string): Promise<{
  buffer: Buffer;
  fileName: string;
  contentType: string;
} | null> {
  await ensureStorageReady();
  const fileName = extractUploadFileName(imageUrl);
  if (!fileName) {
    return null;
  }

  const uploadDir = getUploadsDirectory();
  const absolutePath = path.join(uploadDir, fileName);

  try {
    const buffer = await readFile(absolutePath);
    return {
      buffer,
      fileName,
      contentType: contentTypeForExtension(path.extname(fileName) || ".bin"),
    };
  } catch {
    return null;
  }
}
