import { randomUUID } from "node:crypto";
import path from "node:path";
import {
  getSupabaseServiceClient,
  isSupabaseStorageConfigured,
  ensureStorageBucket,
  BUCKET_NAME,
} from "@/src/lib/supabase/server-client";

function getSafeFileExtension(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  if (!ext) return ".bin";
  return ext.replace(/[^a-z0-9.]/g, "") || ".bin";
}

function createFileName(originalName: string): string {
  const extension = getSafeFileExtension(originalName);
  return `${Date.now()}-${randomUUID()}${extension}`;
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

function extractFileName(imageUrl: string): string {
  const trimmed = imageUrl.trim();
  if (!trimmed) return "";

  // Handle Supabase public URLs
  const supabaseMatch = trimmed.match(/\/product_images\/([^?#]+)/);
  if (supabaseMatch) return supabaseMatch[1] ?? "";

  // Handle legacy /uploads/ paths
  const uploadsMatch = trimmed.match(/^\/(?:api\/)?uploads\/([^/?#]+)$/i);
  if (uploadsMatch) return uploadsMatch[1]?.replace(/[^a-zA-Z0-9._-]/g, "") ?? "";

  return "";
}

export async function saveUploadedFiles(files: File[]): Promise<string[]> {
  if (!isSupabaseStorageConfigured) {
    throw new Error(
      "Supabase storage is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  const client = getSupabaseServiceClient();
  if (!client) {
    throw new Error("Failed to initialize Supabase storage client.");
  }

  await ensureStorageBucket();

  const uploadedUrls: string[] = [];

  for (const file of files) {
    const fileName = createFileName(file.name);
    const buffer = Buffer.from(await file.arrayBuffer());
    const contentType =
      file.type || contentTypeForExtension(getSafeFileExtension(file.name));

    const { error } = await client.storage
      .from(BUCKET_NAME)
      .upload(fileName, buffer, { contentType, upsert: false });

    if (error) {
      console.error(`[merchflow:upload] Supabase upload failed for ${fileName}:`, error.message);
      throw new Error(`Upload failed: ${error.message}`);
    }

    const { data: urlData } = client.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName);

    if (!urlData?.publicUrl) {
      console.error(`[merchflow:upload] Failed to get public URL for ${fileName}`);
      throw new Error("Failed to get public URL for uploaded file.");
    }

    uploadedUrls.push(urlData.publicUrl);
  }

  return uploadedUrls;
}

export async function readStoredUpload(imageUrl: string): Promise<{
  buffer: Buffer;
  fileName: string;
  contentType: string;
} | null> {
  const fileName = extractFileName(imageUrl);
  if (!fileName) return null;

  const client = getSupabaseServiceClient();
  if (!client) return null;

  try {
    const { data, error } = await client.storage
      .from(BUCKET_NAME)
      .download(fileName);

    if (error || !data) {
      console.error(`[merchflow:upload] Download failed for ${fileName}:`, error?.message);
      return null;
    }

    const buffer = Buffer.from(await data.arrayBuffer());
    return {
      buffer,
      fileName,
      contentType: contentTypeForExtension(path.extname(fileName) || ".bin"),
    };
  } catch (err) {
    console.error(`[merchflow:upload] Error reading ${fileName}:`, err);
    return null;
  }
}
