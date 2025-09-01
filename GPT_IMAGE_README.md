# GPT-Image-1 Integration

This document describes the GPT-Image-1 integration added to the NexVision application.

## Features Implemented

### 1. Text-to-Image Generation (`/api/images/generate`)
- **Endpoint**: `POST /api/images/generate`
- **Features**:
  - Generate images from text prompts using OpenAI's GPT-Image-1 model
  - Support for multiple image sizes (1024×1024, 1024×1792, 1792×1024)
  - Quality settings (standard, HD)
  - Disk caching with filename hashing for improved performance
  - Rate limiting (5 requests per minute)

### 2. Image Editing (`/api/images/edit`)
- **Endpoint**: `POST /api/images/edit`
- **Features**:
  - Edit existing images with text prompts
  - Optional mask support (white=keep, black=edit)
  - EXIF orientation correction for mobile uploads
  - Multiple size options (256×256, 512×512, 1024×1024)
  - Automatic image format validation
  - Disk caching with content-based hashing

### 3. EXIF Orientation Handling
- **Module**: `src/lib/image-orientation.ts`
- **Features**:
  - Automatic detection and correction of mobile photo orientation
  - Support for all 8 EXIF orientation values
  - Preserves image quality while stripping EXIF data
  - Enhanced mobile device compatibility

### 4. Disk Cache System
- **Location**: `public/cache/images/`
- **Features**:
  - SHA-256 based filename hashing
  - Content-aware caching (same prompt + settings = cached result)
  - Automatic cache directory creation
  - Serves cached images as static files

### 5. React UI (`/gpt-image`)
- **Component**: `src/app/gpt-image/page.tsx`
- **Features**:
  - Toggle between text-to-image and image editing modes
  - File upload with drag-and-drop support
  - Preset prompt selection for quick usage
  - Mask upload for selective editing
  - Real-time preview of uploaded images
  - Download functionality for generated results
  - Responsive design for mobile and desktop

## API Usage

### Generate Image
```javascript
const response = await fetch('/api/images/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'A beautiful modern house with large windows',
    size: '1024x1024',
    quality: 'standard',
    n: 1,
    response_format: 'url'
  })
});

const data = await response.json();
// data.data[0].url contains the generated image URL
```

### Edit Image
```javascript
const formData = new FormData();
formData.append('image', imageFile);
formData.append('mask', maskFile); // optional
formData.append('prompt', 'Change the exterior color to blue');
formData.append('size', '1024x1024');

const response = await fetch('/api/images/edit', {
  method: 'POST',
  body: formData
});

const data = await response.json();
// data.data[0].url contains the edited image URL
```

## Configuration

### Environment Variables
```env
OPENAI_API_KEY=your_openai_api_key_here
# Optional: scope requests to a specific org/project
OPENAI_ORG_ID=org_1234abcd
OPENAI_PROJECT_ID=proj_1234abcd

# Models (set to gpt-image-1 once enabled for your org)
OPENAI_IMAGE_GENERATE_MODEL=gpt-image-1
OPENAI_IMAGE_EDIT_MODEL=gpt-image-1
```

### Cache Directory
The system automatically creates the cache directory at `public/cache/images/`. Ensure your deployment has write permissions to this directory.

## Rate Limiting

- **Generate endpoint**: 5 requests per minute per IP
- **Edit endpoint**: 3 requests per minute per IP
- Rate limits are stored in memory (consider Redis for production)

## Error Handling

The API includes comprehensive error handling for:
- Invalid file formats
- File size limits (10MB max)
- Content policy violations
- API rate limits
- Network timeouts
- Invalid prompts

## Security Features

- File type validation (PNG, JPEG only)
- File size limits
- EXIF data stripping
- Input sanitization
- Rate limiting
- Error message sanitization

## Testing

Use the test script to verify endpoints:
```bash
node test-gpt-image-api.js
```

Or test through the UI at: `http://localhost:3000/gpt-image`

## Future Enhancements

1. **Model Updates**: Default to GPT-Image-1 where supported
2. **Advanced Caching**: Implement Redis-based caching for production
3. **Batch Processing**: Support multiple image generation/editing
4. **Progress Tracking**: WebSocket-based progress updates
5. **Advanced Masking**: Built-in mask creation tools
6. **Style Transfer**: Preset style transfer options
