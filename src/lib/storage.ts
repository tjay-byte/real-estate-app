import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  listAll,
} from 'firebase/storage';
import { storage } from './firebase';

// Maximum file size in bytes (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Allowed image types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

interface UploadResult {
  url: string;
  path: string;
}

/**
 * Validates a file before upload
 */
export const validateFile = (file: File) => {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error('Only JPEG, PNG and WebP images are allowed');
  }
};

/**
 * Uploads a single image to Firebase Storage
 */
export const uploadImage = async (
  file: File,
  path: string,
  fileName?: string
): Promise<UploadResult> => {
  try {
    // Validate the file
    validateFile(file);

    // Create a unique filename if not provided
    const finalFileName = fileName || `${Date.now()}-${file.name}`;
    const fullPath = `${path}/${finalFileName}`;

    // Create a reference to the file location
    const storageRef = ref(storage, fullPath);

    // Upload the file
    const snapshot = await uploadBytes(storageRef, file);

    // Get the download URL
    const url = await getDownloadURL(snapshot.ref);

    return {
      url,
      path: fullPath,
    };
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};

/**
 * Uploads multiple images to Firebase Storage
 */
export const uploadMultipleImages = async (
  files: File[],
  path: string
): Promise<UploadResult[]> => {
  try {
    const uploadPromises = files.map((file) => uploadImage(file, path));
    return Promise.all(uploadPromises);
  } catch (error) {
    console.error('Error uploading multiple images:', error);
    throw error;
  }
};

/**
 * Deletes an image from Firebase Storage
 */
export const deleteImage = async (path: string): Promise<void> => {
  try {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
  } catch (error) {
    console.error('Error deleting image:', error);
    throw error;
  }
};

/**
 * Deletes multiple images from Firebase Storage
 */
export const deleteMultipleImages = async (paths: string[]): Promise<void> => {
  try {
    const deletePromises = paths.map((path) => deleteImage(path));
    await Promise.all(deletePromises);
  } catch (error) {
    console.error('Error deleting multiple images:', error);
    throw error;
  }
};

/**
 * Lists all images in a directory
 */
export const listImages = async (path: string): Promise<string[]> => {
  try {
    const storageRef = ref(storage, path);
    const result = await listAll(storageRef);
    const urls = await Promise.all(result.items.map((item) => getDownloadURL(item)));
    return urls;
  } catch (error) {
    console.error('Error listing images:', error);
    throw error;
  }
};