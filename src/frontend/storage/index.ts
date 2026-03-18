import {
  getDownloadURL,
  ref,
  uploadBytes,
  type FirebaseStorage,
  type UploadMetadata
} from "firebase/storage";
import { resolveImageCompressionMb } from "../../core/firestore/utils.js";

export type FrontendImageUploadOptions = {
  directory: string;
  fileName?: string;
  metadata?: UploadMetadata;
  imageCompressionMb?: number;
  imageCompress?: number;
};

export type FrontendImageUploadResult = {
  path: string;
  downloadURL: string;
  compressed: boolean;
  bytes: number;
};

export type FrontendStorageClientOptions = {
  storage: FirebaseStorage;
};

const DEFAULT_MAX_COMPRESSION_ATTEMPTS = 12;

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

function readImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(blob);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Unable to decode image for compression."));
    };

    image.src = objectUrl;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob === null) {
        reject(new Error("Unable to generate compressed image blob."));
        return;
      }

      resolve(blob);
    }, mimeType, quality);
  });
}

async function compressImageBlob(sourceBlob: Blob, maxSizeMb: number): Promise<Blob> {
  if (sourceBlob.type.startsWith("image/") === false) {
    return sourceBlob;
  }

  const maxBytes = Math.floor(maxSizeMb * 1024 * 1024);
  if (sourceBlob.size <= maxBytes) {
    return sourceBlob;
  }

  const image = await readImageFromBlob(sourceBlob);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (context === null) {
    return sourceBlob;
  }

  let width = image.naturalWidth;
  let height = image.naturalHeight;
  let quality = 0.92;
  let attempts = 0;
  let candidate = sourceBlob;

  while (attempts < DEFAULT_MAX_COMPRESSION_ATTEMPTS) {
    canvas.width = Math.max(1, Math.floor(width));
    canvas.height = Math.max(1, Math.floor(height));

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    candidate = await canvasToBlob(canvas, sourceBlob.type, quality);

    if (candidate.size <= maxBytes) {
      return candidate;
    }

    if (quality > 0.45) {
      quality = quality - 0.08;
    } else {
      width = width * 0.88;
      height = height * 0.88;
      quality = 0.82;
    }

    attempts = attempts + 1;
  }

  if (candidate.size < sourceBlob.size) {
    return candidate;
  }

  return sourceBlob;
}

export class FrontendStorageClient {
  private readonly storage;

  constructor(options: FrontendStorageClientOptions) {
    this.storage = options.storage;
  }

  public async uploadImage(file: File | Blob, options: FrontendImageUploadOptions): Promise<FrontendImageUploadResult> {
    const compressionMb = resolveImageCompressionMb(options);
    const normalizedName = options.fileName && options.fileName.trim()
      ? options.fileName.trim()
      : createDefaultFileName(file.type);

    const payload = compressionMb
      ? await compressImageBlob(file, compressionMb)
      : file;

    const path = buildPath(options.directory, normalizedName);
    const storageRef = ref(this.storage, path);

    const uploadResult = await uploadBytes(storageRef, payload, options.metadata);
    const downloadURL = await getDownloadURL(uploadResult.ref);

    return {
      path: uploadResult.metadata.fullPath,
      downloadURL,
      compressed: payload.size < file.size,
      bytes: payload.size
    };
  }
}
