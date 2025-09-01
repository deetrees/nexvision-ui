const OpenAI = require('openai');

// Load API key from .env.local manually
const fs = require('fs');
const path = require('path');

try {
  const envFile = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
  const lines = envFile.split('\n');
  for (const line of lines) {
    if (line.startsWith('OPENAI_API_KEY=')) {
      process.env.OPENAI_API_KEY = line.split('=')[1];
      break;
    }
  }
} catch (error) {
  console.error('Could not load .env.local file');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function testGPTImage1() {
  try {
    console.log('🧪 Testing GPT-Image-1 API...');
    
    // Test image generation
    const response = await openai.images.generate({
      model: "gpt-image-1",
      prompt: "A modern house with large windows and a beautiful garden",
      size: "1024x1024",
      n: 1,
    });

    console.log('✅ GPT-Image-1 Full Response:');
    console.log(JSON.stringify(response, null, 2));

  } catch (error) {
    console.error('❌ GPT-Image-1 Error:', error.message);
    console.log('Full error:', error);
  }
}

testGPTImage1();
