export async function convertToJpeg(imageData: string): Promise<string> {
  // If it's already a JPEG, return as is
  if (imageData.startsWith('data:image/jpeg')) {
    return imageData;
  }

  try {
    // Create a canvas element
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = imageData;
    });

    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    // Draw the image and convert to JPEG
    ctx.drawImage(img, 0, 0);
    const jpegData = canvas.toDataURL('image/jpeg', 0.9);

    return jpegData;
  } catch (error) {
    console.error('Error converting image:', error);
    throw new Error('Failed to convert image to JPEG');
  }
} 