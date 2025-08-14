# Training Data Collection System

This document explains how NexVision automatically collects and stores images for AI model training and fine-tuning.

## Overview

The system automatically captures and stores image transformation data whenever users successfully generate reimagined home exteriors. This data is valuable for:

- Training new AI models
- Fine-tuning existing models
- Improving transformation quality
- Understanding user preferences

## Data Collection Process

### Automatic Collection
- **When**: Every time a user successfully generates a reimagined image
- **What**: Original image, transformed image, instruction text, metadata
- **Where**: Stored in `/training-data/` directory
- **Privacy**: Only links to email if user provided one

### Data Structure

Each training session creates:
```
training-data/
├── session-2025-01-15T10-30-45-123Z/
│   ├── original-2025-01-15T10-30-45-123Z.jpg
│   ├── reimagined-2025-01-15T10-30-45-123Z.jpg
│   └── metadata-2025-01-15T10-30-45-123Z.json
└── training-log.jsonl
```

### Metadata Format
```json
{
  "timestamp": "2025-01-15T10:30:45.123Z",
  "instruction": "make it modern farmhouse style",
  "userEmail": "user@example.com",
  "originalFilename": "original-2025-01-15T10-30-45-123Z.jpg",
  "reimaginedFilename": "reimagined-2025-01-15T10-30-45-123Z.jpg",
  "originalSize": 1024000,
  "reimaginedSize": 987654,
  "sessionId": "session-2025-01-15T10-30-45-123Z"
}
```

## API Endpoints

### Store Images
- **Endpoint**: `POST /api/store-image`
- **Purpose**: Store training data
- **Parameters**: 
  - `originalImage` (File)
  - `reimaginedImage` (File)
  - `instruction` (string)
  - `userEmail` (string, optional)

### Get Statistics
- **Endpoint**: `GET /api/store-image`
- **Purpose**: Retrieve training data statistics
- **Returns**: Session count, image count, latest session, etc.

## Admin Dashboard

Access the training data dashboard at `/admin/training-data` to view:
- Total training sessions
- Total images collected
- Unique instruction types
- Latest session timestamp

## File Management

### Storage Location
All training data is stored in the `training-data/` directory in the project root.

### File Naming Convention
- **Sessions**: `session-{ISO-timestamp}/`
- **Images**: `{type}-{ISO-timestamp}.jpg`
- **Metadata**: `metadata-{ISO-timestamp}.json`

### Master Log
The `training-log.jsonl` file contains one JSON object per line for easy processing:
```
{"timestamp":"2025-01-15T10:30:45.123Z","instruction":"modern farmhouse","sessionId":"session-2025-01-15T10-30-45-123Z"}
{"timestamp":"2025-01-15T11:15:22.456Z","instruction":"contemporary style","sessionId":"session-2025-01-15T11-15-22-456Z"}
```

## Privacy & Compliance

### Data Collection
- **Automatic**: Images and instructions are collected automatically
- **Optional**: Email addresses are only stored if provided by user
- **Anonymous**: Users without email are stored as "anonymous"

### Data Usage
- Training AI models
- Improving transformation quality
- Understanding user preferences
- Model fine-tuning

### Data Retention
- Files are stored indefinitely for training purposes
- Consider implementing data retention policies as needed
- Users can request data deletion if needed

## Integration with Model Training

### Data Format
The collected data is ready for use with popular ML frameworks:
- **PyTorch**: Load images and metadata for training loops
- **TensorFlow**: Create datasets from stored images
- **Hugging Face**: Fine-tune diffusion models

### Preprocessing
Consider these preprocessing steps:
1. **Image Standardization**: Resize to consistent dimensions
2. **Instruction Cleaning**: Normalize text instructions
3. **Quality Filtering**: Remove low-quality transformations
4. **Data Augmentation**: Generate additional training samples

### Example Training Script Structure
```python
import json
import os
from PIL import Image

def load_training_data(data_dir):
    sessions = []
    for session_dir in os.listdir(data_dir):
        if session_dir.startswith('session-'):
            metadata_path = os.path.join(data_dir, session_dir, f"metadata-{session_dir[8:]}.json")
            with open(metadata_path) as f:
                metadata = json.load(f)
            
            original_img = Image.open(os.path.join(data_dir, session_dir, metadata['originalFilename']))
            reimagined_img = Image.open(os.path.join(data_dir, session_dir, metadata['reimaginedFilename']))
            
            sessions.append({
                'original': original_img,
                'reimagined': reimagined_img,
                'instruction': metadata['instruction'],
                'timestamp': metadata['timestamp']
            })
    
    return sessions
```

## Monitoring & Maintenance

### Regular Checks
- Monitor disk space usage
- Check data quality periodically
- Review instruction diversity
- Validate image integrity

### Backup Strategy
- Regular backups of training data
- Consider cloud storage for redundancy
- Version control for training datasets

### Performance Optimization
- Compress images if storage becomes an issue
- Archive old sessions periodically
- Index metadata for faster queries

## Troubleshooting

### Common Issues
1. **Storage Full**: Monitor disk space, implement cleanup policies
2. **Permission Errors**: Ensure write permissions on training-data directory
3. **Image Corruption**: Validate images before storage
4. **Metadata Inconsistency**: Validate JSON structure

### Debugging
- Check browser console for client-side errors
- Review server logs for API endpoint issues
- Verify file system permissions
- Test with sample data

## Future Enhancements

### Potential Improvements
- **Cloud Storage**: Store data in AWS S3 or similar
- **Database Integration**: Store metadata in PostgreSQL/MongoDB
- **Data Validation**: Implement image quality checks
- **User Consent**: Add explicit consent for data collection
- **Data Export**: Tools for exporting training datasets
- **Analytics**: Advanced analytics on collected data

### Model Training Integration
- **Automated Pipelines**: Trigger training when enough data is collected
- **A/B Testing**: Compare models trained on different datasets
- **Quality Metrics**: Track improvement in transformation quality
- **User Feedback**: Collect user ratings on transformations
