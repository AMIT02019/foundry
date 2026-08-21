import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Cloudflare R2 speaks the S3 API and charges nothing for egress, which matters
 * when the product is a 40 MB zip downloaded on every update check.
 */
const client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
  },
});

const BUCKET = process.env.R2_BUCKET ?? "foundry-products";

/** Buyers never see this URL directly — it is redirected to, then discarded. */
export function signedDownloadUrl(fileKey: string, filename: string) {
  return getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: BUCKET,
      Key: fileKey,
      ResponseContentDisposition: `attachment; filename="${filename}"`,
    }),
    { expiresIn: 300 },
  );
}

/** Sellers upload straight to R2 so the zip never touches our server. */
export function signedUploadUrl(fileKey: string) {
  return getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: fileKey,
      ContentType: "application/zip",
    }),
    { expiresIn: 600 },
  );
}

export function productFileKey(
  productSlug: string,
  version: string,
): string {
  return `products/${productSlug}/${productSlug}-${version}.zip`;
}
