"use client";
import React, { useRef, useState, useEffect } from "react";
import { validateImageFile, compressImage, formatBytes, MAX_IMAGE_SIZE } from "../utils/image";

interface ImageMetadata {
  model: string;
  version: string;
}

interface EditHistoryItem {
  imageUrl: string;
  prompt: string;
  timestamp: number;
  metadata: ImageMetadata | null;
}

export default function Home() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [editPrompt, setEditPrompt] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [imageMetadata, setImageMetadata] = useState<ImageMetadata | null>(null);
  const [editHistory, setEditHistory] = useState<EditHistoryItem[]>([]);
  const [selectedEditIndex, setSelectedEditIndex] = useState<number>(-1);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid && validation.error) {
      setError(validation.error);
      return;
    }

    try {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      if (file.size > MAX_IMAGE_SIZE) {
        setIsCompressing(true);
        const compressedFile = await compressImage(file);
        setSelectedImage(compressedFile);
        setPreviewUrl(URL.createObjectURL(compressedFile));
      } else {
        setSelectedImage(file);
        setPreviewUrl(URL.createObjectURL(file));
      }
      
      setResultImage(null);
      setImageMetadata(null);
      setEditHistory([]);
      setSelectedEditIndex(-1);
      setError(null);
    } catch (err) {
      setError('Error processing image. Please try another file.');
      console.error('Error handling image:', err);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedImage) {
      setError("Please upload an image first!");
      return;
    }
    if (!editPrompt.trim()) {
      setError("Please enter an edit instruction!");
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      const formData = new FormData();
      if (selectedEditIndex >= 0) {
        const response = await fetch(editHistory[selectedEditIndex].imageUrl);
        const blob = await response.blob();
        const file = new File([blob], 'edited-image.jpg', { type: 'image/jpeg' });
        formData.append('image', file);
      } else {
        formData.append('image', selectedImage);
      }
      formData.append('prompt', editPrompt);

      const response = await fetch('/api/edit-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process image');
      }

      const data = await response.json();
      if (data.success && data.editedImageUrl) {
        const newEdit: EditHistoryItem = {
          imageUrl: data.editedImageUrl,
          prompt: editPrompt,
          timestamp: Date.now(),
          metadata: data.metadata,
        };
        
        setEditHistory(prev => [...prev, newEdit]);
        setSelectedEditIndex(editHistory.length);
        setResultImage(data.editedImageUrl);
        setImageMetadata(data.metadata);
        setEditPrompt('');
      } else {
        throw new Error(data.error || 'Failed to process image');
      }
    } catch (error) {
      console.error('Error processing image:', error);
      setError(error instanceof Error ? error.message : 'Failed to process image');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEditSelect = (index: number) => {
    setSelectedEditIndex(index);
    setResultImage(editHistory[index].imageUrl);
    setImageMetadata(editHistory[index].metadata);
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-start p-8 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-6xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 text-transparent bg-clip-text">
            NexVision
          </h1>
          <p className="text-gray-600 text-lg">
            Transform your home with AI. Upload a photo and describe the changes you want.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-center">
            {error}
          </div>
        )}

        {isCompressing && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-center">
            Compressing image for optimal processing...
          </div>
        )}

        {!selectedImage ? (
          <div className="flex flex-col items-center">
            <div 
              className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center cursor-pointer hover:border-blue-500 transition-colors"
            >
              <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p className="mt-4 text-sm text-gray-600">Click to upload a photo of your home</p>
              <p className="mt-2 text-xs text-gray-500">
                Maximum size: {formatBytes(MAX_IMAGE_SIZE)} • JPEG, PNG, or WebP
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="w-full mb-8">
              <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
                <div className="mb-4">
                  <label htmlFor="edit-prompt" className="block text-sm font-medium text-gray-700 mb-2">
                    What changes would you like to make?
                    {selectedEditIndex >= 0 && (
                      <span className="text-blue-600 ml-2">
                        (Continuing from Edit #{selectedEditIndex + 1})
                      </span>
                    )}
                  </label>
                  <div className="flex gap-4">
                    <input
                      id="edit-prompt"
                      type="text"
                      value={editPrompt}
                      onChange={(e) => setEditPrompt(e.target.value)}
                      placeholder="e.g. Make the roof blue"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      type="submit"
                      disabled={isProcessing}
                      className={`px-6 py-2 rounded-md text-white font-medium ${
                        isProcessing 
                          ? 'bg-gray-400 cursor-not-allowed' 
                          : 'bg-blue-600 hover:bg-blue-700'
                      } transition-colors whitespace-nowrap`}
                    >
                      {isProcessing ? (
                        <span className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Processing...
                        </span>
                      ) : 'Generate Edit'}
                    </button>
                  </div>
                </div>
              </form>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
              <div className="flex flex-col items-center">
                <div className="relative group">
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-300 rounded-lg"></div>
                  <img 
                    src={previewUrl || ''} 
                    alt="Original" 
                    className="w-full rounded-lg shadow-lg object-cover"
                    style={{ maxHeight: '500px', width: '100%' }}
                  />
                  <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                    Original Image
                  </div>
                  <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                    {formatBytes(selectedImage.size)}
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col items-center">
                {resultImage ? (
                  <div className="relative group">
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-300 rounded-lg"></div>
                    <img 
                      src={resultImage} 
                      alt="Result" 
                      className="w-full rounded-lg shadow-lg object-cover"
                      style={{ maxHeight: '500px', width: '100%' }}
                    />
                    <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                      Edit #{selectedEditIndex + 1}
                    </div>
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = resultImage;
                          link.download = `edited-home-${selectedEditIndex + 1}.jpg`;
                          link.click();
                        }}
                        className="bg-black bg-opacity-50 hover:bg-opacity-70 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download
                      </button>
                    </div>
                    {imageMetadata && (
                      <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                        {imageMetadata.model}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-full h-full min-h-[500px] rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <p>Enter a prompt and click "Generate Edit"</p>
                      <p className="text-sm mt-2">Your edited image will appear here</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {editHistory.length > 0 && (
              <div className="w-full mt-8">
                <h3 className="text-lg font-semibold mb-4">Edit History</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {editHistory.map((edit, index) => (
                    <div 
                      key={edit.timestamp}
                      className={`relative cursor-pointer group ${
                        index === selectedEditIndex ? 'ring-2 ring-blue-500' : ''
                      }`}
                      onClick={() => handleEditSelect(index)}
                    >
                      <img 
                        src={edit.imageUrl} 
                        alt={`Edit ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 rounded-lg"></div>
                      <div className="absolute bottom-2 left-2 right-2 bg-black bg-opacity-50 text-white text-xs p-1 rounded">
                        <div className="font-medium">Edit #{index + 1}</div>
                        <div className="text-xs truncate">{edit.prompt}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <button
              onClick={() => {
                if (previewUrl) {
                  URL.revokeObjectURL(previewUrl);
                }
                setSelectedImage(null);
                setPreviewUrl(null);
                setResultImage(null);
                setImageMetadata(null);
                setEditHistory([]);
                setSelectedEditIndex(-1);
                setEditPrompt('');
                setError(null);
              }}
              className="mt-8 text-sm text-gray-600 hover:text-gray-800"
            >
              Upload a different photo
            </button>
          </div>
        )}
      </div>

      <input
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        ref={fileInputRef}
        onChange={handleImageChange}
      />
    </main>
  );
}
