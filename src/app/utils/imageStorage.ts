/**
 * Utility functions for storing images for model training
 */

export interface ImageStorageData {
  originalImage: File;
  reimaginedImageUrl: string;
  instruction: string;
  userEmail?: string;
}

/**
 * Convert a URL to a File object
 */
export async function urlToFile(url: string, filename: string): Promise<File> {
  const response = await fetch(url);
  const blob = await response.blob();
  return new File([blob], filename, { type: blob.type });
}

/**
 * Store images for model training
 */
export async function storeImagesForTraining(data: ImageStorageData): Promise<boolean> {
  try {
    // Convert reimagined image URL to File
    const reimaginedFile = await urlToFile(
      data.reimaginedImageUrl, 
      `reimagined-${Date.now()}.jpg`
    );

    // Create form data
    const formData = new FormData();
    formData.append('originalImage', data.originalImage);
    formData.append('reimaginedImage', reimaginedFile);
    formData.append('instruction', data.instruction);
    if (data.userEmail) {
      formData.append('userEmail', data.userEmail);
    }

    // Send to storage API
    const response = await fetch('/api/store-image', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Storage failed: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('Images stored for training:', result.sessionId);
    return true;

  } catch (error) {
    console.error('Failed to store images for training:', error);
    return false;
  }
}

/**
 * Get training data statistics
 */
export async function getTrainingDataStats() {
  try {
    const response = await fetch('/api/store-image');
    if (!response.ok) {
      throw new Error(`Failed to get stats: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to get training data stats:', error);
    return null;
  }
}
