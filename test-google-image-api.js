const fs = require('fs');

// Read API key from .env.local
let apiKey = '';
try {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  const match = envContent.match(/GEMINI_API_KEY=(.+)/);
  apiKey = match ? match[1].trim() : '';
} catch (error) {
  console.log('❌ Could not read .env.local file');
  process.exit(1);
}

async function testImageGeneration() {
  if (!apiKey) {
    console.log('❌ No GEMINI_API_KEY found in .env.local');
    return;
  }
  
  console.log('🔑 Testing image generation with API key:', apiKey.substring(0, 10) + '...');
  
  const prompt = "Create a picture of a nano banana dish in a fancy restaurant with a Gemini theme";
  
  try {
    const model = 'gemini-2.5-flash-image-preview';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024
        }
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Image generation request successful!');
      if (data.modelVersion) {
        console.log('Model version:', data.modelVersion);
      }
      
      // Check if response contains inline data (image)
      const parts = data.candidates[0].content.parts;
      let hasImage = false;
      
      for (const part of parts) {
        if (part.text) {
          console.log('Text response:', part.text);
        }
        if (part.inlineData) {
          hasImage = true;
          const mime = part.inlineData.mimeType || 'image/png';
          console.log('📸 Image data received, size:', part.inlineData.data.length, 'bytes', 'mime:', mime);
          
          // Save image
          const imageBuffer = Buffer.from(part.inlineData.data, 'base64');
          const ext = mime === 'image/png' ? 'png' : 'jpg';
          const filename = `generated_image.${ext}`;
          fs.writeFileSync(filename, imageBuffer);
          console.log(`💾 Image saved as ${filename}`);
        }
      }
      
      if (!hasImage) {
        console.log('ℹ️  No image data in response - model may not support image generation');
      }
    } else {
      console.log('❌ API Error:', response.status, response.statusText);
      const errorData = await response.text();
      console.log('Error details:', errorData);
    }
  } catch (error) {
    console.log('❌ Network error:', error.message);
  }
}

testImageGeneration();
