import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const originalImage = formData.get('originalImage') as File;
    const reimaginedImage = formData.get('reimaginedImage') as File;
    const instruction = formData.get('instruction') as string;
    const userEmail = formData.get('userEmail') as string;

    if (!originalImage || !reimaginedImage || !instruction) {
      return NextResponse.json(
        { error: 'Missing required fields: originalImage, reimaginedImage, or instruction' },
        { status: 400 }
      );
    }

    // Create training data directory structure
    const trainingDataDir = join(process.cwd(), 'training-data');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const sessionDir = join(trainingDataDir, `session-${timestamp}`);

    // Ensure directories exist
    if (!existsSync(trainingDataDir)) {
      await mkdir(trainingDataDir, { recursive: true });
    }
    await mkdir(sessionDir, { recursive: true });

    // Convert files to buffers
    const originalBuffer = Buffer.from(await originalImage.arrayBuffer());
    const reimaginedBuffer = Buffer.from(await reimaginedImage.arrayBuffer());

    // Generate filenames
    const originalFilename = `original-${timestamp}.jpg`;
    const reimaginedFilename = `reimagined-${timestamp}.jpg`;
    const metadataFilename = `metadata-${timestamp}.json`;

    // Save images
    await writeFile(join(sessionDir, originalFilename), originalBuffer);
    await writeFile(join(sessionDir, reimaginedFilename), reimaginedBuffer);

    // Save metadata
    const metadata = {
      timestamp: new Date().toISOString(),
      instruction: instruction,
      userEmail: userEmail || 'anonymous',
      originalFilename: originalFilename,
      reimaginedFilename: reimaginedFilename,
      originalSize: originalImage.size,
      reimaginedSize: reimaginedImage.size,
      sessionId: `session-${timestamp}`
    };

    await writeFile(
      join(sessionDir, metadataFilename), 
      JSON.stringify(metadata, null, 2)
    );

    // Also append to a master log file for easy tracking
    const masterLogPath = join(trainingDataDir, 'training-log.jsonl');
    const logEntry = JSON.stringify(metadata) + '\n';
    
    try {
      await writeFile(masterLogPath, logEntry, { flag: 'a' });
    } catch (error) {
      // If file doesn't exist, create it
      await writeFile(masterLogPath, logEntry);
    }

    console.log(`Stored training data for session: ${metadata.sessionId}`);

    return NextResponse.json({
      success: true,
      sessionId: metadata.sessionId,
      message: 'Images stored successfully for model training'
    });

  } catch (error) {
    console.error('Error storing images:', error);
    return NextResponse.json(
      { error: 'Failed to store images' },
      { status: 500 }
    );
  }
}

// Optional: GET endpoint to retrieve training data statistics
export async function GET() {
  try {
    const trainingDataDir = join(process.cwd(), 'training-data');
    const masterLogPath = join(trainingDataDir, 'training-log.jsonl');

    if (!existsSync(masterLogPath)) {
      return NextResponse.json({
        totalSessions: 0,
        message: 'No training data found'
      });
    }

    const fs = require('fs');
    const logContent = fs.readFileSync(masterLogPath, 'utf-8');
    const lines = logContent.trim().split('\n').filter((line: string) => line.length > 0);
    
    const sessions = lines.map((line: string) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    }).filter(Boolean);

    const stats = {
      totalSessions: sessions.length,
      totalImages: sessions.length * 2, // original + reimagined
      latestSession: sessions[sessions.length - 1]?.timestamp,
      instructionTypes: [...new Set(sessions.map((s: any) => s.instruction))].length
    };

    return NextResponse.json(stats);

  } catch (error) {
    console.error('Error retrieving training data stats:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve training data statistics' },
      { status: 500 }
    );
  }
}
