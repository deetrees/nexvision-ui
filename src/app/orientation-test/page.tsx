'use client';

import { useState } from 'react';
import { correctImageOrientation, needsOrientationCorrection, debugOrientation, getOrientationInfo } from '../../lib/image-orientation';

interface TestResult {
  originalUrl: string;
  correctedUrl: string;
  needsCorrection: boolean;
  orientationInfo: any;
  processingTime: number;
  fileSize: { original: number; corrected: number };
}

export default function OrientationTestPage() {
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setTestResult(null);
    setDebugInfo('');

    const startTime = Date.now();

    try {
      // Capture debug info
      let debugOutput = '';
      const originalConsoleLog = console.log;
      const originalConsoleGroup = console.group;
      const originalConsoleGroupEnd = console.groupEnd;
      
      console.log = (...args) => {
        debugOutput += args.join(' ') + '\n';
        originalConsoleLog(...args);
      };
      console.group = (label) => {
        debugOutput += `\n=== ${label} ===\n`;
        originalConsoleGroup(label);
      };
      console.groupEnd = () => {
        debugOutput += '\n';
        originalConsoleGroupEnd();
      };

      // Show original image
      const originalUrl = URL.createObjectURL(file);

      // Get detailed orientation info
      await debugOrientation(file);
      const orientationInfo = await getOrientationInfo(file);
      const needsFix = await needsOrientationCorrection(file);

      // Apply orientation correction
      const correctedFile = await correctImageOrientation(file);
      const correctedUrl = URL.createObjectURL(correctedFile);

      const processingTime = Date.now() - startTime;

      // Restore console
      console.log = originalConsoleLog;
      console.group = originalConsoleGroup;
      console.groupEnd = originalConsoleGroupEnd;

      setTestResult({
        originalUrl,
        correctedUrl,
        needsCorrection: needsFix,
        orientationInfo,
        processingTime,
        fileSize: {
          original: file.size,
          corrected: correctedFile.size
        }
      });

      setDebugInfo(debugOutput);

    } catch (error) {
      console.error('Error processing image:', error);
      alert(`Failed to process image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    return (bytes / 1024 / 1024).toFixed(1) + 'MB';
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '1400px', margin: '0 auto' }}>
      <h1>📱 Enhanced EXIF Orientation Test</h1>
      <p>Comprehensive testing for iOS and Android mobile photo orientation correction.</p>
      
      <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <h3>🧪 Test Instructions:</h3>
        <ol>
          <li><strong>iOS Users:</strong> Take photos in different orientations (portrait, landscape, upside down)</li>
          <li><strong>Android Users:</strong> Test with various camera apps and orientations</li>
          <li><strong>Upload here:</strong> See detailed EXIF analysis and correction results</li>
          <li><strong>Check debug info:</strong> View detailed processing information below</li>
        </ol>
      </div>
      
      <input 
        type="file" 
        accept="image/*" 
        onChange={handleFileChange}
        style={{ 
          marginBottom: '20px', 
          padding: '15px', 
          border: '2px dashed #007bff',
          borderRadius: '8px',
          width: '100%',
          fontSize: '16px'
        }}
      />
      
      {isProcessing && (
        <div style={{ 
          padding: '20px', 
          background: 'linear-gradient(90deg, #007bff, #0056b3)', 
          color: 'white',
          borderRadius: '8px', 
          marginBottom: '20px',
          textAlign: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px' }}>
            <div style={{ 
              width: '24px', 
              height: '24px', 
              border: '3px solid rgba(255,255,255,0.3)', 
              borderTop: '3px solid white', 
              borderRadius: '50%', 
              animation: 'spin 1s linear infinite' 
            }}></div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 'bold' }}>🔄 Processing Image Orientation</div>
              <div style={{ fontSize: '14px', opacity: 0.9 }}>Reading EXIF data, applying corrections, and optimizing...</div>
            </div>
          </div>
        </div>
      )}

      {testResult && (
        <>
          {/* Status Summary */}
          <div style={{ 
            padding: '20px', 
            background: testResult.needsCorrection ? '#fff3cd' : '#d4edda', 
            borderRadius: '8px', 
            marginBottom: '20px',
            border: `2px solid ${testResult.needsCorrection ? '#ffc107' : '#28a745'}`
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
              <div style={{ fontSize: '32px' }}>
                {testResult.needsCorrection ? '⚠️' : '✅'}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '20px' }}>
                  {testResult.needsCorrection ? 'Orientation Correction Applied' : 'Image Already Correctly Oriented'}
                </h3>
                <p style={{ margin: '5px 0 0 0', opacity: 0.8 }}>
                  EXIF Orientation: {testResult.orientationInfo.orientation} | 
                  Processing Time: {testResult.processingTime}ms | 
                  Size: {formatFileSize(testResult.fileSize.original)} → {formatFileSize(testResult.fileSize.corrected)}
                </p>
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', fontSize: '14px' }}>
              <div><strong>Original Orientation:</strong> {testResult.orientationInfo.orientation}</div>
              <div><strong>Rotation Applied:</strong> {testResult.orientationInfo.transform.rotate}°</div>
              <div><strong>Horizontal Flip:</strong> {testResult.orientationInfo.transform.flipH ? 'Yes' : 'No'}</div>
              <div><strong>Vertical Flip:</strong> {testResult.orientationInfo.transform.flipV ? 'Yes' : 'No'}</div>
            </div>
          </div>

          {/* Image Comparison */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
            <div>
              <h3 style={{ textAlign: 'center', marginBottom: '15px' }}>📷 Original Image (Raw Upload)</h3>
              <div style={{ 
                border: '3px solid #dc3545', 
                borderRadius: '12px', 
                overflow: 'hidden',
                background: '#f8f9fa'
              }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={testResult.originalUrl} 
                  alt="Original" 
                  style={{ width: '100%', height: 'auto', display: 'block' }}
                />
              </div>
              <div style={{ 
                textAlign: 'center', 
                padding: '10px', 
                background: '#f8d7da', 
                color: '#721c24',
                fontSize: '14px',
                fontWeight: 'bold'
              }}>
                May appear sideways due to EXIF orientation
              </div>
            </div>
            
            <div>
              <h3 style={{ textAlign: 'center', marginBottom: '15px' }}>✅ Corrected Image (Processed)</h3>
              <div style={{ 
                border: '3px solid #28a745', 
                borderRadius: '12px', 
                overflow: 'hidden',
                background: '#f8f9fa'
              }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={testResult.correctedUrl} 
                  alt="Corrected" 
                  style={{ width: '100%', height: 'auto', display: 'block' }}
                />
              </div>
              <div style={{ 
                textAlign: 'center', 
                padding: '10px', 
                background: '#d4edda', 
                color: '#155724',
                fontSize: '14px',
                fontWeight: 'bold'
              }}>
                Always displays upright (EXIF stripped)
              </div>
            </div>
          </div>
        </>
      )}

      {/* Debug Information */}
      {debugInfo && (
        <div style={{ marginTop: '30px' }}>
          <h3>🔍 Debug Information</h3>
          <pre style={{ 
            background: '#f8f9fa', 
            padding: '20px', 
            borderRadius: '8px', 
            fontSize: '12px',
            overflow: 'auto',
            border: '1px solid #dee2e6',
            whiteSpace: 'pre-wrap'
          }}>
            {debugInfo}
          </pre>
        </div>
      )}

      {/* Device-Specific Testing Guide */}
      <div style={{ marginTop: '40px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div style={{ padding: '20px', background: '#e3f2fd', borderRadius: '8px', border: '1px solid #2196f3' }}>
          <h3 style={{ color: '#1976d2', marginTop: 0 }}>📱 iOS Testing</h3>
          <ul style={{ fontSize: '14px', lineHeight: '1.6' }}>
            <li><strong>Camera App:</strong> Take photos in all orientations</li>
            <li><strong>Portrait Mode:</strong> Test with portrait photography</li>
            <li><strong>Screenshots:</strong> Try rotated screenshots</li>
            <li><strong>Third-party Apps:</strong> Test photos from Instagram, Snapchat, etc.</li>
            <li><strong>HEIC Format:</strong> Test with HEIC images (converted automatically)</li>
          </ul>
        </div>
        
        <div style={{ padding: '20px', background: '#e8f5e8', borderRadius: '8px', border: '1px solid #4caf50' }}>
          <h3 style={{ color: '#2e7d32', marginTop: 0 }}>🤖 Android Testing</h3>
          <ul style={{ fontSize: '14px', lineHeight: '1.6' }}>
            <li><strong>Stock Camera:</strong> Test default camera app orientations</li>
            <li><strong>Google Camera:</strong> Test with Pixel camera features</li>
            <li><strong>Samsung Camera:</strong> Test with Samsung-specific features</li>
            <li><strong>Auto-rotate:</strong> Test with auto-rotate on/off</li>
            <li><strong>Different Manufacturers:</strong> Test across device brands</li>
          </ul>
        </div>
      </div>

      {/* Technical Details */}
      <div style={{ marginTop: '30px', padding: '20px', background: '#f8f9fa', borderRadius: '8px' }}>
        <h3>🔧 Technical Implementation</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px', fontSize: '14px' }}>
          <div>
            <strong>EXIF Parsing:</strong><br/>
            Custom EXIF reader with enhanced mobile support
          </div>
          <div>
            <strong>Orientation Values:</strong><br/>
            Handles all 8 EXIF orientation values (1-8)
          </div>
          <div>
            <strong>Canvas Transforms:</strong><br/>
            Rotation, horizontal/vertical flips
          </div>
          <div>
            <strong>Quality Preservation:</strong><br/>
            92% JPEG quality, optimized compression
          </div>
          <div>
            <strong>Error Handling:</strong><br/>
            Graceful fallbacks, timeout protection
          </div>
          <div>
            <strong>Performance:</strong><br/>
            Parallel processing, efficient memory usage
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
