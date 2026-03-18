import { type Bucket } from "firebase-admin/storage";
import { resolveImageCompressionMb } from "../../core/firestore/utils.js";

export type BackendImageCompressorInput = {
  bytes: Buffer;
  maxBytes: number;
  contentType: string;
};

export type BackendImageCompressor = (
  input: BackendImageCompressorInput
) => Promise<Buffer>;

export type BackendStorageClientOptions = {
  bucket: Bucket;
  imageCompressor?: BackendImageCompressor;
};

export type BackendImageUploadOptions = {
  directory: string;
  fileName?: string;
  contentType: string;
  bytes: Buffer | Uint8Array;
  metadata?: Record<string, string>;
  cacheControl?: string;
  makePublic?: boolean;
  imageCompressionMb?: number;
  imageCompress?: number;
};

export type BackendImageUploadResult = {
  path: string;
  bucketName: string;
  compressed: boolean;
  bytes: number;
  publicUrl?: string;
};

function normalizeDirectory(value: string): string {
  return value
    .split("/")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .join("/");
}

function extensionFromMimeType(mimeType: string): string {
  if (mimeType === "image/jpeg") {
    return "jpg";
  }

  if (mimeType === "image/png") {
    return "png";
  }

  if (mimeType === "image/webp") {
    return "webp";
  }

  const slashIndex = mimeType.indexOf("/");
  if (slashIndex >= 0) {
    return mimeType.slice(slashIndex + 1);
  }

  return "bin";
}

function createDefaultFileName(mimeType: string): string {
  const extension = extensionFromMimeType(mimeType || "application/octet-stream");
  const randomChunk = Math.random().toString(36).slice(2, 8);
  return String(Date.now()) + "-" + randomChunk + "." + extension;
}

function buildPath(directory: string, fileName: string): string {
  const normalizedDirectory = normalizeDirectory(directory);
  if (normalizedDirectory.length === 0) {
    return fileName;
  }

  return normalizedDirectory + "/" + fileName;
}

function toBuffer(bytes: Buffer | Uint8Array): Buffer {
  if (Buffer.isBuffer(bytes)) {
    return bytes;
  }

  return Buffer.from(bytes);
}

function encodePathForPublicUrl(path: string): string {
  return path
    .split("/")
    .map((entry) => encodeURIComponent(entry))
    .join("/");
}

export class BackendStorageClient {
  private readonly bucket;
  private readonly imageCompressor;

  constructor(options: BackendStorageClientOptions) {
    this.bucket = options.bucket;
    this.imageCompressor = options.imageCompressor;
  }

  public async uploadImage(options: BackendImageUploadOptions): Promise<BackendImageUploadResult> {
    const compressionMb = resolveImageCompressionMb(options);
    const targetBytes = compressionMb ? Math.floor(compressionMb * 1024 * 1024) : undefined;

    const sourceBuffer = toBuffer(options.bytes);
    let payload = sourceBuffer;

    if (targetBytes && sourceBuffer.length > targetBytes && this.imageCompressor) {
      payload = await this.imageCompressor({
        bytes: sourceBuffer,
        maxBytes: targetBytes,
        contentType: options.contentType
      });
    }

    const normalizedName = options.fileName && options.fileName.trim()
      ? options.fileName.trim()
      : createDefaultFileName(options.contentType);

    const path = buildPath(options.directory, normalizedName);
    const file = this.bucket.file(path);

    await file.save(payload, {
      resumable: false,
      metadata: {
        contentType: options.contentType,
        cacheControl: options.cacheControl,
        metadata: options.metadata
      }
    });

    let publicUrl: string | undefined;
    if (options.makePublic === true) {
      await file.makePublic();
      publicUrl = "https://storage.googleapis.com/" + this.bucket.name + "/" + encodePathForPublicUrl(path);
    }

    return {
      path,
      bucketName: this.bucket.name,
      compressed: payload.length < sourceBuffer.length,
      bytes: payload.length,
      publicUrl
    };
  }
}
