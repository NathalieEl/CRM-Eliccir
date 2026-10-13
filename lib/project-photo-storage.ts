import "server-only";

import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

type StorageConfig = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
};

let client: S3Client | null = null;

function storageConfig(): StorageConfig | null {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const bucketName = process.env.R2_BUCKET_NAME?.trim();
  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) return null;
  return { accountId, accessKeyId, secretAccessKey, bucketName };
}

export function isProjectPhotoStorageConfigured() {
  return storageConfig() !== null;
}

function storageClient() {
  const config = storageConfig();
  if (!config) throw new Error("Project photo storage is not configured");
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }
  return { client, bucketName: config.bucketName };
}

export function projectPhotoObjectKey(propertyId: string, photoId: string) {
  const environment = (process.env.RAILWAY_ENVIRONMENT_NAME || "local")
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-");
  return `${environment}/properties/${propertyId}/${photoId}.webp`;
}

export async function putProjectPhoto(objectKey: string, body: Buffer) {
  const storage = storageClient();
  await storage.client.send(new PutObjectCommand({
    Bucket: storage.bucketName,
    Key: objectKey,
    Body: body,
    ContentType: "image/webp",
    CacheControl: "private, max-age=31536000, immutable",
  }));
}

export async function getProjectPhoto(objectKey: string) {
  const storage = storageClient();
  const response = await storage.client.send(new GetObjectCommand({ Bucket: storage.bucketName, Key: objectKey }));
  if (!response.Body) return null;
  return Buffer.from(await response.Body.transformToByteArray());
}

export async function deleteProjectPhotoObject(objectKey: string) {
  const storage = storageClient();
  await storage.client.send(new DeleteObjectCommand({ Bucket: storage.bucketName, Key: objectKey }));
}