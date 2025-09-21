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

async function testGoogleAPI() {
  
  if (!apiKey) {
    console.log('❌ No GEMINI_API_KEY found in .env.local');
    return;
  }
  
  console.log('🔑 API Key found:', apiKey.substring(0, 10) + '...');
  
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: "Hello, this is a test message."
          }]
        }]
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Google API is working!');
      console.log('Response:', data.candidates[0].content.parts[0].text);
    } else {
      console.log('❌ API Error:', response.status, response.statusText);
      const errorData = await response.text();
      console.log('Error details:', errorData);
    }
  } catch (error) {
    console.log('❌ Network error:', error.message);
  }
}

testGoogleAPI();
