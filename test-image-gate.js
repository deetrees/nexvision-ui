const fs = require('fs');
const path = require('path');

// Test the image gate health check
async function testHealthCheck() {
  console.log('🔍 Testing Image Gate Health Check...');
  
  try {
    const response = await fetch('http://localhost:3000/api/image-gate');
    const data = await response.json();
    
    console.log('Health Check Response:', JSON.stringify(data, null, 2));
    
    if (data.status === 'healthy') {
      console.log('✅ Image Gate is healthy and connected to Rekognition');
      return true;
    } else {
      console.log('❌ Image Gate is unhealthy:', data.error);
      return false;
    }
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
    return false;
  }
}

// Test with a sample image (you'll need to provide an image file)
async function testImageAnalysis(imagePath) {
  console.log(`🖼️  Testing Image Analysis with: ${imagePath}`);
  
  if (!fs.existsSync(imagePath)) {
    console.log('❌ Image file not found. Please provide a valid image path.');
    return false;
  }
  
  try {
    const formData = new FormData();
    const imageBuffer = fs.readFileSync(imagePath);
    const blob = new Blob([imageBuffer], { type: 'image/jpeg' });
    formData.append('image', blob, path.basename(imagePath));
    
    const response = await fetch('http://localhost:3000/api/image-gate', {
      method: 'POST',
      body: formData,
    });
    
    const data = await response.json();
    
    console.log('Analysis Response:', JSON.stringify(data, null, 2));
    
    if (data.success) {
      if (data.approved) {
        console.log('✅ Image APPROVED - Contains architectural content');
      } else {
        console.log('❌ Image REJECTED - Reasons:', data.reasons.join(', '));
      }
      return true;
    } else {
      console.log('❌ Analysis failed:', data.error);
      return false;
    }
  } catch (error) {
    console.log('❌ Image analysis failed:', error.message);
    return false;
  }
}

// Main test function
async function runTests() {
  console.log('🚀 Starting Image Gate Tests...\n');
  
  // Test 1: Health Check
  const healthOk = await testHealthCheck();
  console.log('');
  
  if (!healthOk) {
    console.log('❌ Health check failed. Make sure the server is running and AWS credentials are configured.');
    return;
  }
  
  // Test 2: Image Analysis (if image provided)
  const imagePath = process.argv[2];
  if (imagePath) {
    await testImageAnalysis(imagePath);
  } else {
    console.log('💡 To test image analysis, run: node test-image-gate.js /path/to/your/image.jpg');
  }
  
  console.log('\n✨ Tests completed!');
}

// Run tests
runTests().catch(console.error);
