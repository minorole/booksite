import { v2 as cloudinary } from 'cloudinary';

if (!process.env.CLOUDINARY_URL) {
  throw new Error('Missing CLOUDINARY_URL');
}

// Configure Cloudinary using URL
cloudinary.config({
  secure: true
});

// Dynamically import sharp to handle environments where it might not be available
const getSharp = async () => {
  try {
    return await import('sharp');
  } catch (error) {
    console.warn('Sharp not available, falling back to direct upload');
    return null;
  }
};

export const uploadImage = async (base64Image: string): Promise<string> => {
  try {
    // Remove data:image/[type];base64, prefix if present
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
    
    let processedBase64 = base64Data;
    
    // Try to use sharp for image processing if available
    const sharp = await getSharp();
    if (sharp) {
      try {
        // Convert base64 to buffer
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Compress and resize image using sharp
        const processedBuffer = await sharp.default(buffer)
          .resize(1000, 1000, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .jpeg({
            quality: 80,
            progressive: true
          })
          .toBuffer();
        
        // Convert back to base64
        processedBase64 = processedBuffer.toString('base64');
      } catch (sharpError) {
        console.warn('Sharp processing failed, using original image:', sharpError);
      }
    }
    
    // Upload processed image
    const result = await cloudinary.uploader.upload(
      `data:image/jpeg;base64,${processedBase64}`, 
      {
        resource_type: 'image',
        folder: 'book-covers',
        transformation: [
          { quality: "auto" },
          { fetch_format: "auto" }
        ]
      }
    );
    
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