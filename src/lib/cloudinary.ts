import { v2 as cloudinary } from 'cloudinary';

// Use dynamic import for heic2any since it's a client-side only module
const heic2any = async () => {
  if (typeof window !== 'undefined') {
    return (await import('heic2any')).default;
  }
  return null;
};

if (!process.env.CLOUDINARY_URL) {
  throw new Error('Missing CLOUDINARY_URL');
}

// Configure Cloudinary
cloudinary.config({
  secure: true
});

async function convertHeicToJpeg(file: File): Promise<File> {
  // Check both mime type and file extension
  const isHeic = file.type === 'image/heic' || 
                 file.type === 'image/heif' ||
                 file.name.toLowerCase().endsWith('.heic') ||
                 file.name.toLowerCase().endsWith('.heif');
                 
  if (isHeic) {
    try {
      const heicConverter = await heic2any();
      if (!heicConverter) {
        throw new Error('HEIC conversion not available');
      }
      
      const blob = await heicConverter({
        blob: file,
        toType: 'image/jpeg',
        quality: 0.8
      });
      
      return new File(
        [Array.isArray(blob) ? blob[0] : blob], 
        file.name.replace(/\.(heic|heif)$/i, '.jpg'),
        { type: 'image/jpeg' }
      );
    } catch (error) {
      console.error('HEIC conversion error:', error);
      throw new Error('Failed to convert HEIC image. Please try uploading a JPEG or PNG instead.');
    }
  }
  return file;
}

/**
 * Optimizes image for different purposes using Cloudinary transformations
 * @param publicId Cloudinary public ID of the image
 * @param purpose 'display' | 'ai'
 */
const getOptimizedUrl = (publicId: string, purpose: 'display' | 'ai') => {
  const baseTransformation = {
    fetch_format: 'auto',
    quality: 'auto',
  };

  const transformations = {
    display: {
      ...baseTransformation,
      width: 800,
      crop: 'limit',
      format: 'webp',
    },
    ai: {
      ...baseTransformation,
      width: 512,  // OpenAI recommended size
      height: 512,
      crop: 'fill',
      format: 'jpg',
      effect: 'sharpen:100',  // Enhance text clarity
    }
  };

  // Remove any existing transformations from publicId
  const cleanPublicId = publicId.split('/upload/')[1]?.split('?')[0] || publicId;

  return cloudinary.url(cleanPublicId, {
    transformation: [transformations[purpose]],
  });
};

/**
 * Compresses an image before upload if it exceeds size limit
 * @param base64Data Base64 string of the image
 * @returns Compressed base64 string
 */
const compressImageIfNeeded = async (base64Data: string): Promise<string> => {
  // Calculate approximate size in bytes
  const approximateSize = (base64Data.length * 3) / 4;
  
  // If under 10MB, return as is
  if (approximateSize < 10 * 1024 * 1024) {
    return base64Data;
  }

  try {
    // Create a temporary URL from the base64
    const blob = await fetch(base64Data).then(r => r.blob());
    
    // Create an image element
    const img = new Image();
    img.src = URL.createObjectURL(blob);
    
    await new Promise((resolve) => {
      img.onload = resolve;
    });

    // Create canvas for compression
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Calculate new dimensions (maintain aspect ratio)
    let { width, height } = img;
    const maxDimension = 2048; // Max dimension for reasonable file size
    
    if (width > height && width > maxDimension) {
      height = (height * maxDimension) / width;
      width = maxDimension;
    } else if (height > maxDimension) {
      width = (width * maxDimension) / height;
      height = maxDimension;
    }

    canvas.width = width;
    canvas.height = height;
    
    // Draw and compress
    ctx?.drawImage(img, 0, 0, width, height);
    
    // Get compressed base64 (0.7 quality)
    return canvas.toDataURL('image/jpeg', 0.7);
  } catch (error) {
    console.warn('Compression failed, trying original:', error);
    return base64Data;
  }
};

/**
 * Uploads and processes an image for both website display and AI analysis
 */
export const uploadAndOptimizeImage = async (imageData: File | string) => {
  type OptimizeResult = {
    displayUrl: string;    // For book listing display
    originalImageData: string;  // For LLM analysis
  };

  try {
    let processedFile: File | string = imageData;
    let base64Data: string;

    // Handle File objects (from direct uploads)
    if (imageData instanceof File) {
      // Check file size (20MB limit)
      if (imageData.size > 20 * 1024 * 1024) {
        throw new Error('Image size exceeds 20MB limit');
      }

      // Convert HEIC/HEIF to JPEG if needed
      if (imageData.type === 'image/heic' || imageData.type === 'image/heif') {
        try {
          const heicConverter = await heic2any();
          if (!heicConverter) {
            throw new Error('HEIC conversion not available');
          }
          
          const blob = await heicConverter({
            blob: imageData,
            toType: 'image/jpeg',
            quality: 0.8
          });
          
          processedFile = new File(
            [Array.isArray(blob) ? blob[0] : blob], 
            imageData.name.replace(/\.(heic|heif)$/i, '.jpg'),
            { type: 'image/jpeg' }
          );
        } catch (error) {
          console.error('HEIC conversion error:', error);
          throw new Error('Failed to convert HEIC image to JPEG');
        }
      }
      
      // Convert to base64 for both LLM and Cloudinary
      base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result);
          } else {
            reject(new Error('Failed to convert image to base64'));
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(processedFile as File);
      });
    } else {
      base64Data = imageData;
      
      // Check base64 size
      const approximateSize = (base64Data.length * 3) / 4;
      if (approximateSize > 20 * 1024 * 1024) {
        throw new Error('Image size exceeds 20MB limit');
      }
    }

    // Upload to Cloudinary for display URL
    const uploadResult = await cloudinary.uploader.upload(base64Data, {
      resource_type: 'image',
      folder: 'book-covers',
      transformation: [{
        quality: 'auto',
        fetch_format: 'auto',
        width: 2048,
        crop: 'limit'
      }]
    });

    // Get display URL for book listing
    const displayUrl = cloudinary.url(uploadResult.public_id, {
      transformation: [{
        width: 800,
        crop: 'limit',
        quality: 'auto',
        fetch_format: 'auto'
      }]
    });

    return {
      displayUrl,           // URL for book listing
      originalImageData: base64Data  // Original/converted image data for LLM
    } as OptimizeResult;
  } catch (error) {
    console.error('Error in uploadAndOptimizeImage:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to process image');
  }
};

// Legacy support for existing code
export const uploadImage = async (base64Image: string): Promise<string> => {
  const { displayUrl } = await uploadAndOptimizeImage(base64Image);
  return displayUrl;
};

export const optimizeImage = (url: string, width: number = 500) => {
  return cloudinary.url(url, {
    width,
    crop: 'fill',
    quality: 'auto',
    fetch_format: 'auto'
  });
} 