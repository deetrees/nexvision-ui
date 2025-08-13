/**
 * Enhanced Image Orientation Correction Utility
 * Robust EXIF handling for iOS and Android mobile uploads
 */

// EXIF orientation values and their transformations
const ORIENTATION_TRANSFORMS = {
  1: { rotate: 0, flipH: false, flipV: false },    // Normal
  2: { rotate: 0, flipH: true, flipV: false },     // Flip horizontal
  3: { rotate: 180, flipH: false, flipV: false },  // Rotate 180°
  4: { rotate: 180, flipH: true, flipV: false },   // Rotate 180° + flip horizontal
  5: { rotate: 90, flipH: true, flipV: false },    // Rotate 90° + flip horizontal
  6: { rotate: 90, flipH: false, flipV: false },   // Rotate 90° clockwise
  7: { rotate: 270, flipH: true, flipV: false },   // Rotate 270° + flip horizontal
  8: { rotate: 270, flipH: false, flipV: false },  // Rotate 270° clockwise
} as const;

interface ImageDimensions {
  width: number;
  height: number;
}

interface OrientationInfo {
  orientation: number;
  needsCorrection: boolean;
  transform: typeof ORIENTATION_TRANSFORMS[keyof typeof ORIENTATION_TRANSFORMS];
}

/**
 * Enhanced EXIF orientation detection with better mobile support
 */
function getImageOrientation(file: File): Promise<number> {
  return new Promise((resolve) => {
    // Check file type - EXIF is primarily in JPEG files
    const isJPEG = file.type.includes('jpeg') || file.type.includes('jpg') || 
                   file.name.toLowerCase().includes('.jpg') || file.name.toLowerCase().includes('.jpeg');
    
    if (!isJPEG) {
      console.log('📄 Non-JPEG file, assuming normal orientation');
      resolve(1);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const arrayBuffer = e.target?.result as ArrayBuffer;
      
      try {
        const orientation = parseEXIFOrientation(arrayBuffer);
        console.log(`📐 EXIF orientation detected: ${orientation}`);
        resolve(orientation);
      } catch (error) {
        console.warn('⚠️ Error reading EXIF orientation:', error);
        resolve(1); // Default to normal orientation
      }
    };
    
    reader.onerror = () => {
      console.warn('⚠️ Failed to read file for EXIF data');
      resolve(1);
    };
    
    // Read more data to ensure we capture EXIF (especially for mobile photos)
    reader.readAsArrayBuffer(file.slice(0, 128 * 1024)); // Read first 128KB
  });
}

/**
 * Parse EXIF orientation from ArrayBuffer with enhanced mobile support
 */
function parseEXIFOrientation(arrayBuffer: ArrayBuffer): number {
  const dataView = new DataView(arrayBuffer);
  
  // Check JPEG signature
  if (dataView.getUint16(0, false) !== 0xFFD8) {
    throw new Error('Not a valid JPEG file');
  }

  let offset = 2;
  
  // Scan for APP1 marker (0xFFE1) which contains EXIF data
  while (offset < dataView.byteLength - 1) {
    const marker = dataView.getUint16(offset, false);
    
    if (marker === 0xFFE1) {
      // Found APP1 marker, check for EXIF
      const segmentLength = dataView.getUint16(offset + 2, false);
      const segmentEnd = offset + 2 + segmentLength;
      
      if (segmentEnd > dataView.byteLength) break;
      
      // Check for "Exif\0\0" identifier
      const exifIdentifier = dataView.getUint32(offset + 4, false);
      const exifPadding = dataView.getUint16(offset + 8, false);
      
      if (exifIdentifier === 0x45786966 && exifPadding === 0x0000) {
        // Found EXIF data, parse TIFF header
        const tiffOffset = offset + 10;
        return parseTIFFOrientation(dataView, tiffOffset, segmentEnd);
      }
      
      offset = segmentEnd;
    } else if ((marker & 0xFF00) === 0xFF00) {
      // Skip other markers
      const segmentLength = dataView.getUint16(offset + 2, false);
      offset += 2 + segmentLength;
    } else {
      break;
    }
  }
  
  return 1; // Default orientation if no EXIF found
}

/**
 * Parse TIFF orientation data with improved endianness handling
 */
function parseTIFFOrientation(dataView: DataView, tiffOffset: number, maxOffset: number): number {
  if (tiffOffset + 8 > maxOffset) return 1;
  
  // Read TIFF header to determine byte order
  const byteOrder = dataView.getUint16(tiffOffset, false);
  const isLittleEndian = byteOrder === 0x4949; // "II" for little endian, "MM" for big endian
  
  if (byteOrder !== 0x4949 && byteOrder !== 0x4D4D) {
    throw new Error('Invalid TIFF byte order');
  }
  
  // Verify TIFF magic number
  const tiffMagic = dataView.getUint16(tiffOffset + 2, isLittleEndian);
  if (tiffMagic !== 42) {
    throw new Error('Invalid TIFF magic number');
  }
  
  // Get IFD0 offset
  const ifd0Offset = tiffOffset + dataView.getUint32(tiffOffset + 4, isLittleEndian);
  
  if (ifd0Offset + 2 > maxOffset) return 1;
  
  // Read number of directory entries
  const entryCount = dataView.getUint16(ifd0Offset, isLittleEndian);
  
  // Search for orientation tag (0x0112)
  for (let i = 0; i < entryCount; i++) {
    const entryOffset = ifd0Offset + 2 + (i * 12);
    
    if (entryOffset + 12 > maxOffset) break;
    
    const tag = dataView.getUint16(entryOffset, isLittleEndian);
    
    if (tag === 0x0112) { // Orientation tag
      const dataType = dataView.getUint16(entryOffset + 2, isLittleEndian);
      const dataCount = dataView.getUint32(entryOffset + 4, isLittleEndian);
      
      if (dataType === 3 && dataCount === 1) { // SHORT type, single value
        const orientation = dataView.getUint16(entryOffset + 8, isLittleEndian);
        return Math.min(Math.max(orientation, 1), 8); // Clamp to valid range
      }
    }
  }
  
  return 1; // Default if orientation tag not found
}

/**
 * Get image dimensions with better error handling
 */
function getImageDimensions(file: File): Promise<ImageDimensions> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    const cleanup = () => URL.revokeObjectURL(url);
    
    img.onload = () => {
      cleanup();
      resolve({ 
        width: img.naturalWidth || img.width, 
        height: img.naturalHeight || img.height 
      });
    };
    
    img.onerror = () => {
      cleanup();
      reject(new Error('Failed to load image for dimension detection'));
    };
    
    // Set timeout to prevent hanging
    setTimeout(() => {
      cleanup();
      reject(new Error('Image loading timeout'));
    }, 10000);
    
    img.src = url;
  });
}

/**
 * Get comprehensive orientation information
 */
export async function getOrientationInfo(file: File): Promise<OrientationInfo> {
  const orientation = await getImageOrientation(file);
  const needsCorrection = orientation !== 1;
  const transform = ORIENTATION_TRANSFORMS[orientation as keyof typeof ORIENTATION_TRANSFORMS] || ORIENTATION_TRANSFORMS[1];
  
  return {
    orientation,
    needsCorrection,
    transform
  };
}

/**
 * Enhanced image orientation correction with better mobile support
 */
export async function correctImageOrientation(file: File, quality: number = 0.92): Promise<File> {
  try {
    console.log('🔄 Starting orientation correction for:', file.name);
    
    // Get orientation info and dimensions in parallel
    const [orientationInfo, dimensions] = await Promise.all([
      getOrientationInfo(file),
      getImageDimensions(file)
    ]);
    
    console.log(`📐 Orientation: ${orientationInfo.orientation}, Needs correction: ${orientationInfo.needsCorrection}`);
    console.log(`📏 Original dimensions: ${dimensions.width}x${dimensions.height}`);
    
    // If no correction needed, just strip EXIF and return
    if (!orientationInfo.needsCorrection) {
      console.log('✅ Image already correctly oriented, stripping EXIF...');
      return await stripEXIFData(file, quality);
    }
    
    // Apply orientation correction
    return await applyOrientationTransform(file, orientationInfo, dimensions, quality);
    
  } catch (error) {
    console.error('❌ Error in orientation correction:', error);
    // Fallback: strip EXIF without rotation
    return await stripEXIFData(file, quality);
  }
}

/**
 * Apply orientation transformation with enhanced mobile support
 */
async function applyOrientationTransform(
  file: File, 
  orientationInfo: OrientationInfo, 
  dimensions: ImageDimensions, 
  quality: number
): Promise<File> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Failed to get canvas context'));
      return;
    }
    
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    const cleanup = () => URL.revokeObjectURL(url);
    
    img.onload = () => {
      try {
        const { rotate, flipH, flipV } = orientationInfo.transform;
        
        // Determine canvas dimensions (swap for 90°/270° rotations)
        const needsDimensionSwap = rotate === 90 || rotate === 270;
        canvas.width = needsDimensionSwap ? dimensions.height : dimensions.width;
        canvas.height = needsDimensionSwap ? dimensions.width : dimensions.height;
        
        console.log(`🔄 Applying transform: rotate=${rotate}°, flipH=${flipH}, flipV=${flipV}`);
        console.log(`📐 Canvas dimensions: ${canvas.width}x${canvas.height}`);
        
        // Apply transformations
        ctx.save();
        
        // Move to center for rotation
        ctx.translate(canvas.width / 2, canvas.height / 2);
        
        // Apply rotation
        if (rotate !== 0) {
          ctx.rotate((rotate * Math.PI) / 180);
        }
        
        // Apply flips
        let scaleX = flipH ? -1 : 1;
        let scaleY = flipV ? -1 : 1;
        ctx.scale(scaleX, scaleY);
        
        // Draw image centered
        ctx.drawImage(
          img, 
          -dimensions.width / 2, 
          -dimensions.height / 2, 
          dimensions.width, 
          dimensions.height
        );
        
        ctx.restore();
        
        // Convert to blob with high quality
        canvas.toBlob((blob) => {
          cleanup();
          
          if (blob) {
            const correctedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            
            console.log(`✅ Orientation corrected successfully`);
            console.log(`📊 Size: ${(file.size / 1024 / 1024).toFixed(1)}MB → ${(correctedFile.size / 1024 / 1024).toFixed(1)}MB`);
            resolve(correctedFile);
          } else {
            reject(new Error('Failed to create corrected image blob'));
          }
        }, 'image/jpeg', quality);
        
      } catch (error) {
        cleanup();
        reject(error);
      }
    };
    
    img.onerror = () => {
      cleanup();
      reject(new Error('Failed to load image for orientation correction'));
    };
    
    // Set timeout
    setTimeout(() => {
      cleanup();
      reject(new Error('Image processing timeout'));
    }, 30000);
    
    img.src = url;
  });
}

/**
 * Strip EXIF data while preserving image quality
 */
async function stripEXIFData(file: File, quality: number = 0.92): Promise<File> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Failed to get canvas context'));
      return;
    }
    
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    const cleanup = () => URL.revokeObjectURL(url);
    
    img.onload = () => {
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      
      // Draw image without any transformations
      ctx.drawImage(img, 0, 0);
      
      canvas.toBlob((blob) => {
        cleanup();
        
        if (blob) {
          const strippedFile = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          
          console.log('🧹 EXIF data stripped successfully');
          resolve(strippedFile);
        } else {
          reject(new Error('Failed to strip EXIF data'));
        }
      }, 'image/jpeg', quality);
    };
    
    img.onerror = () => {
      cleanup();
      reject(new Error('Failed to load image for EXIF stripping'));
    };
    
    setTimeout(() => {
      cleanup();
      reject(new Error('EXIF stripping timeout'));
    }, 15000);
    
    img.src = url;
  });
}

/**
 * Check if image needs orientation correction
 */
export async function needsOrientationCorrection(file: File): Promise<boolean> {
  const orientationInfo = await getOrientationInfo(file);
  return orientationInfo.needsCorrection;
}

/**
 * Debug function to log detailed orientation information
 */
export async function debugOrientation(file: File): Promise<void> {
  try {
    const [orientationInfo, dimensions] = await Promise.all([
      getOrientationInfo(file),
      getImageDimensions(file)
    ]);
    
    console.group('🔍 Image Orientation Debug');
    console.log('📁 File:', file.name, `(${(file.size / 1024 / 1024).toFixed(1)}MB)`);
    console.log('📄 Type:', file.type);
    console.log('📐 EXIF Orientation:', orientationInfo.orientation);
    console.log('🔄 Needs Correction:', orientationInfo.needsCorrection);
    console.log('📏 Dimensions:', `${dimensions.width}x${dimensions.height}`);
    console.log('🔧 Transform:', orientationInfo.transform);
    console.groupEnd();
  } catch (error) {
    console.error('❌ Debug orientation failed:', error);
  }
}
