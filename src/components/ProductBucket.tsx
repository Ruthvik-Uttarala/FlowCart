"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import type { EditableBucketField, ProductBucket as Bucket } from "@/src/lib/types";

interface ProductBucketProps {
  bucket: Bucket;
  bucketNumber: number;
  isSaving: boolean;
  isUploading: boolean;
  isEnhancingTitle: boolean;
  isEnhancingDescription: boolean;
  isLaunching: boolean;
  isGlobalBusy: boolean;
  onLocalFieldChange: (
    bucketId: string,
    field: EditableBucketField,
    value: string | number | null
  ) => void;
  onPersistField: (bucketId: string, field: EditableBucketField) => void;
  onImagesChange: (bucketId: string, files: FileList | null) => void;
  onEnhanceTitle: (bucketId: string) => void;
  onEnhanceDescription: (bucketId: string) => void;
  onGo: (bucketId: string) => void;
}

function statusChip(status: Bucket["status"]): string {
  if (status === "DONE") return "bg-emerald-300/20 text-emerald-200";
  if (status === "FAILED") return "bg-rose-300/20 text-rose-200";
  if (status === "PROCESSING") return "bg-sky-300/20 text-sky-200";
  if (status === "ENHANCING") return "bg-amber-300/20 text-amber-200";
  if (status === "READY") return "bg-cyan-300/20 text-cyan-200";
  return "bg-slate-300/20 text-slate-200";
}

export function ProductBucket({
  bucket,
  bucketNumber,
  isSaving,
  isUploading,
  isEnhancingTitle,
  isEnhancingDescription,
  isLaunching,
  isGlobalBusy,
  onLocalFieldChange,
  onPersistField,
  onImagesChange,
  onEnhanceTitle,
  onEnhanceDescription,
  onGo,
}: ProductBucketProps) {
  const controlsLocked =
    isUploading ||
    isEnhancingTitle ||
    isEnhancingDescription ||
    isLaunching ||
    isGlobalBusy ||
    bucket.status === "PROCESSING" ||
    bucket.status === "ENHANCING";

  return (
    <motion.section
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24 }}
      className="glass-card rounded-3xl p-5"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Bucket {bucketNumber}</h2>
          <p className="mt-1 text-xs text-slate-400">ID: {bucket.id}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusChip(bucket.status)}`}>
          {bucket.status}
        </span>
      </div>

      <div className="space-y-4">
        <label className="block space-y-2 text-sm">
          <span className="text-slate-300">Product Images</span>
          <input
            type="file"
            multiple
            accept="image/*"
            disabled={controlsLocked}
            onChange={(event) => onImagesChange(bucket.id, event.target.files)}
            className="block w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-cyan-300 file:px-3 file:py-2 file:text-slate-950 hover:file:bg-cyan-200"
          />
          {bucket.imageUrls.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {bucket.imageUrls.map((imageUrl) => (
                <div key={`${bucket.id}-${imageUrl}`} className="overflow-hidden rounded-xl border border-white/10">
                  <Image
                    src={imageUrl}
                    alt="Uploaded"
                    width={200}
                    height={120}
                    unoptimized
                    className="h-20 w-full object-cover"
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400">Upload at least one image.</p>
          )}
        </label>

        <label className="block space-y-2 text-sm">
          <span className="text-slate-300">Title</span>
          <div className="flex gap-2">
            <input
              value={bucket.titleRaw}
              onChange={(event) =>
                onLocalFieldChange(bucket.id, "titleRaw", event.target.value)
              }
              onBlur={() => onPersistField(bucket.id, "titleRaw")}
              placeholder="Enter title"
              disabled={controlsLocked}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none transition focus:border-cyan-300/60"
            />
            <button
              type="button"
              onClick={() => onEnhanceTitle(bucket.id)}
              disabled={controlsLocked}
              className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isEnhancingTitle ? "Enhancing..." : "Enhance Title"}
            </button>
          </div>
          {bucket.titleEnhanced ? (
            <p className="rounded-xl bg-emerald-400/10 px-3 py-2 text-xs text-emerald-200">
              Enhanced: {bucket.titleEnhanced}
            </p>
          ) : null}
        </label>

        <label className="block space-y-2 text-sm">
          <span className="text-slate-300">Description</span>
          <div className="flex gap-2">
            <textarea
              value={bucket.descriptionRaw}
              onChange={(event) =>
                onLocalFieldChange(bucket.id, "descriptionRaw", event.target.value)
              }
              onBlur={() => onPersistField(bucket.id, "descriptionRaw")}
              rows={4}
              placeholder="Enter description"
              disabled={controlsLocked}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none transition focus:border-cyan-300/60"
            />
            <button
              type="button"
              onClick={() => onEnhanceDescription(bucket.id)}
              disabled={controlsLocked}
              className="h-fit rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isEnhancingDescription ? "Enhancing..." : "Enhance Description"}
            </button>
          </div>
          {bucket.descriptionEnhanced ? (
            <p className="rounded-xl bg-emerald-400/10 px-3 py-2 text-xs text-emerald-200">
              Enhanced: {bucket.descriptionEnhanced}
            </p>
          ) : null}
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span className="text-slate-300">Quantity</span>
            <input
              type="number"
              min="1"
              value={bucket.quantity ?? ""}
              onChange={(event) =>
                onLocalFieldChange(
                  bucket.id,
                  "quantity",
                  event.target.value === "" ? null : Number.parseInt(event.target.value, 10)
                )
              }
              onBlur={() => onPersistField(bucket.id, "quantity")}
              disabled={controlsLocked}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none transition focus:border-cyan-300/60"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="text-slate-300">Price</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={bucket.price ?? ""}
              onChange={(event) =>
                onLocalFieldChange(
                  bucket.id,
                  "price",
                  event.target.value === "" ? null : Number.parseFloat(event.target.value)
                )
              }
              onBlur={() => onPersistField(bucket.id, "price")}
              disabled={controlsLocked}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none transition focus:border-cyan-300/60"
            />
          </label>
        </div>

        {bucket.shopifyProductUrl ? (
          <a
            href={bucket.shopifyProductUrl}
            target="_blank"
            rel="noreferrer"
            className="block rounded-xl border border-emerald-300/30 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-200 hover:underline"
          >
            Shopify URL: {bucket.shopifyProductUrl}
          </a>
        ) : null}

        {bucket.instagramPostUrl ? (
          <a
            href={bucket.instagramPostUrl}
            target="_blank"
            rel="noreferrer"
            className="block rounded-xl border border-pink-300/30 bg-pink-400/10 px-3 py-2 text-sm text-pink-200 hover:underline"
          >
            Instagram URL: {bucket.instagramPostUrl}
          </a>
        ) : null}

        {bucket.errorMessage ? (
          <p className="rounded-xl border border-rose-300/25 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">
            FAILED: {bucket.errorMessage}
          </p>
        ) : null}

        <div className="flex items-center justify-between">
          <div className="text-xs text-slate-400">
            Shopify: {bucket.shopifyCreated ? "Created" : "Pending"} | Instagram:{" "}
            {bucket.instagramPublished ? "Published" : bucket.status === "FAILED" ? "Failed" : "Pending"}
          </div>
          <button
            type="button"
            onClick={() => onGo(bucket.id)}
            disabled={bucket.status !== "READY" || controlsLocked}
            className="rounded-xl bg-gradient-to-r from-cyan-300 via-sky-400 to-orange-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-55"
          >
            {isLaunching ? "Launching..." : "GO"}
          </button>
        </div>

        {isSaving ? <p className="text-xs text-slate-400">Saving changes...</p> : null}
      </div>
    </motion.section>
  );
}
