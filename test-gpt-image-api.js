// Simple test script for GPT-Image-1 API endpoints
const baseUrl = 'http://localhost:3000';

async function testGenerateEndpoint() {
  console.log('🧪 Testing /api/images/generate endpoint...');
  
  try {
    const response = await fetch(`${baseUrl}/api/images/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: 'A beautiful modern house with large windows',
        size: '1024x1024',
        quality: 'standard'
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Generate endpoint test passed');
      console.log('Response:', JSON.stringify(data, null, 2));
    } else {
      console.log('❌ Generate endpoint test failed');
      console.log('Error:', data.error);
    }
  } catch (error) {
    console.log('❌ Generate endpoint test failed with exception:', error.message);
  }
}

async function testEditEndpoint() {
  console.log('🧪 Testing /api/images/edit endpoint...');
  
  // Create a simple test image (1x1 pixel PNG)
  const canvas = document.createElement ? document.createElement('canvas') : null;
  
  if (!canvas) {
    console.log('⚠️ Cannot test edit endpoint in Node.js environment (needs browser)');
    return;
  }
  
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#FF0000';
  ctx.fillRect(0, 0, 1, 1);
  
  canvas.toBlob(async (blob) => {
    const formData = new FormData();
    formData.append('image', blob, 'test.png');
    formData.append('prompt', 'Change the color to blue');
    formData.append('size', '512x512');

    try {
      const response = await fetch(`${baseUrl}/api/images/edit`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      
      if (response.ok) {
        console.log('✅ Edit endpoint test passed');
        console.log('Response:', JSON.stringify(data, null, 2));
      } else {
        console.log('❌ Edit endpoint test failed');
        console.log('Error:', data.error);
      }
    } catch (error) {
      console.log('❌ Edit endpoint test failed with exception:', error.message);
    }
  }, 'image/png');
}

// Run tests
if (typeof window !== 'undefined') {
  // Browser environment
  testGenerateEndpoint();
  setTimeout(testEditEndpoint, 2000);
} else {
  // Node.js environment - only test generate
  console.log('Running in Node.js environment - testing generate endpoint only');
  testGenerateEndpoint();
}