import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  secure: true
});

export const uploadImage = async (file: File): Promise<string> => {
  // Convert file to base64
  const base64Data = await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });

  try {
    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(base64Data as string, {
      resource_type: 'image',
      folder: 'book-covers',
    });
    
    return result.secure_url;
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    throw new Error('Failed to upload image');
  }
};

export const optimizeImage = (url: string, width: number = 500) => {
  return cloudinary.url(url, {
    width,
    crop: 'fill',
    quality: 'auto',
    fetch_format: 'auto',
  });
}; 