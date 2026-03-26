import { getSupabaseServiceClient, BUCKET_NAME } from "@/src/lib/supabase/server-client";
import { readStoredUpload } from "@/src/lib/server/uploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ParamsContext {
  params: Promise<{ file: string }>;
}

export async function GET(_request: Request, context: ParamsContext) {
  try {
    const { file } = await context.params;

    // Try to redirect to Supabase public URL
    const client = getSupabaseServiceClient();
    if (client) {
      const { data } = client.storage.from(BUCKET_NAME).getPublicUrl(file);
      if (data?.publicUrl) {
        return Response.redirect(data.publicUrl, 302);
      }
    }

    // Fallback: try to read and serve directly
    const upload = await readStoredUpload(`/uploads/${file}`);
    if (!upload) {
      return new Response("File not found.", { status: 404 });
    }

    return new Response(new Uint8Array(upload.buffer), {
      status: 200,
      headers: {
        "Content-Type": upload.contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    console.error("[merchflow:uploads] Error serving file:", err);
    return new Response("Failed to load upload.", { status: 500 });
  }
}
