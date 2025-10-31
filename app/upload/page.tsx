/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useRef, useEffect } from 'react';
import { removeBackground } from '@imgly/background-removal';
import Image from 'next/image';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

type Dimensions = { width: number; height: number };

export default function BackgroundRemover() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [originalPreview, setOriginalPreview] = useState<string>('');
  const [processedImage, setProcessedImage] = useState<string>('');
  const [cartoonUrl, setCartoonUrl] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [failedStep, setFailedStep] = useState<'bg' | 'cartoon' | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [imageDimensions, setImageDimensions] = useState<Dimensions>({ width: 0, height: 0 });
  const [processedDimensions, setProcessedDimensions] = useState<Dimensions>({ width: 0, height: 0 });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (failedStep) window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [failedStep]);

  const downloadImage = (url: string, filename: string) => {
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success(`${filename.split('-')[0].charAt(0).toUpperCase() + filename.split('-')[0].slice(1)} downloaded!`);
  };

  const handleImageUpload = async (file: File) => {
    if (!file) return;
    setFailedStep(null);

    try {
      const fileName = file.name.toLowerCase();
      const isHEIC = fileName.endsWith('.heic') || fileName.endsWith('.heif');

      let processedFile = file;

      if (isHEIC) {
        const heic2any = (await import('heic2any')).default;
        const convertedBlob = (await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 })) as Blob;
        processedFile = new File([convertedBlob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), {
          type: 'image/jpeg',
        });
      }

      if (!processedFile.type.startsWith('image/')) {
        toast.error('Please select a valid image file');
        return;
      }
      if (processedFile.size > 10 * 1024 * 1024) {
        toast.error('File size should be less than 10 MB');
        return;
      }

      setSelectedImage(processedFile);
      setProcessedImage('');
      setCartoonUrl('');

      const reader = new FileReader();
      reader.onload = (e) => {
        const src = e.target?.result as string;
        const img = new window.Image();
        img.onload = () => setImageDimensions({ width: img.width, height: img.height });
        img.src = src;
        setOriginalPreview(src);
      };
      reader.readAsDataURL(processedFile);

      toast.success('Image uploaded successfully!');
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Failed to load image.');
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageUpload(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleImageUpload(file);
  };

  const processImage = async () => {
    if (!selectedImage) return;

    setIsProcessing(true);
    setProgress(0);
    setFailedStep(null);

    const interval = setInterval(() => {
      setProgress((p) => (p < 90 ? p + (p < 30 ? 3 : 1) : p));
    }, 150);

    try {
      const blob = await removeBackground(selectedImage);
      clearInterval(interval);
      setProgress(100);

      const url = URL.createObjectURL(blob);
      const img = new window.Image();
      img.onload = () => {
        setProcessedDimensions({ width: img.width, height: img.height });
        setProcessedImage(url);
      };
      img.src = url;

      toast.success('Background removed successfully!');
    } catch (err) {
      clearInterval(interval);
      console.error(err);
      setFailedStep('bg');
      toast.error('Background removal failed. Try again.');
    } finally {
      setIsProcessing(false);
      setTimeout(() => setProgress(0), 1200);
    }
  };

  const handleCartoonize = async () => {
    if (!processedImage) return;
    setIsProcessing(true);
    setFailedStep(null);

    try {
      const blob = await (await fetch(processedImage)).blob();
      const form = new FormData();
      form.append("image", blob, "image.png");

      const response = await axios.post(
        "http://localhost:5000/api/cartoonize",
        form,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      const url = response.data.cartoonUrl;
      if (!url || typeof url !== 'string' || url.length === 0) {
        throw new Error('Invalid cartoon URL received');
      }

      setCartoonUrl(url);
      toast.success('Cartoon created successfully!');
    } catch (err: any) {
      console.error(err);
      setFailedStep('cartoon');
      toast.error('Cartoon conversion failed. Try again later.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRetry = () => {
    if (failedStep === 'bg') processImage();
    else if (failedStep === 'cartoon') handleCartoonize();
  };

  const resetAll = () => {
    setSelectedImage(null);
    setOriginalPreview('');
    setProcessedImage('');
    setCartoonUrl('');
    setFailedStep(null);
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
    toast.info('Reset complete!');
  };

  return (
    <div className="min-h-screen bg-gradient- from-slate-50 via-blue-50 to-indigo-50">
      <ToastContainer 
        position="top-right" 
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />

      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-200/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <h1 className="text-4xl font-bold bg-gradient- from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-2">
              Background Remover & Cartoonizer
            </h1>
            <p className="text-gray-600 text-sm">Transform your images with AI-powered tools</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Alert */}
        {failedStep && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 shadow-sm animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex">
                  <svg className="h-5 w-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-red-800">
                    {failedStep === 'bg' ? 'Background Removal Failed' : 'Cartoonization Failed'}
                  </h3>
                  <p className="text-sm text-red-700 mt-0.5">Please try again or upload a different image</p>
                </div>
              </div>
              <button
                onClick={handleRetry}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-all duration-200 shadow-sm hover:shadow"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Upload Area */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200/50 p-8 mb-8 transition-all duration-300 hover:shadow-xl">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 ${
              isDragOver 
                ? 'border-blue-500 bg-blue-50 scale-[1.02]' 
                : 'border-gray-300 bg-gray-50/50 hover:border-gray-400 hover:bg-gray-100/50'
            }`}
          >
            <input
              type="file"
              accept="image/*,.heic,.heif"
              ref={fileInputRef}
              onChange={handleFileInputChange}
              className="hidden"
              id="uploadInput"
            />
            
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient- from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              
              <div>
                <label htmlFor="uploadInput" className="cursor-pointer">
                  <span className="text-lg font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                    Click to upload
                  </span>
                  <span className="text-gray-600"> or drag and drop</span>
                </label>
                <p className="text-sm text-gray-500 mt-2">JPG, PNG, HEIC – Maximum 10 MB</p>
              </div>
            </div>
          </div>
        </div>

        {/* Image Previews */}
        {originalPreview && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Original Image */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200/50 p-6 transition-all duration-300 hover:shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800">Original</h2>
                <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                  {imageDimensions.width} × {imageDimensions.height}
                </span>
              </div>
              <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-50 border border-gray-200">
                <Image
                  src={originalPreview}
                  alt="original"
                  fill
                  className="object-contain"
                />
              </div>
            </div>

            {/* Background Removed */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200/50 p-6 transition-all duration-300 hover:shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800">Background Removed</h2>
                {processedImage && (
                  <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                    {processedDimensions.width} × {processedDimensions.height}
                  </span>
                )}
              </div>
              <div className="relative aspect-square rounded-xl overflow-hidden bg-gradient- from-gray-50 to-gray-100 border border-gray-200">
                {processedImage ? (
                  <div
                    className="relative w-full h-full group cursor-pointer select-none"
                    onClick={() => downloadImage(processedImage, `bg-removed-${Date.now()}.png`)}
                  >
                    <Image
                      src={processedImage}
                      alt="bg-removed"
                      fill
                      className="object-contain transition-transform duration-300 group-hover:scale-105 pointer-events-none"
                      unselectable="on"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-none">
                      <div className="text-center">
                        <svg className="w-10 h-10 text-white mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        <span className="text-white font-semibold text-sm">Click to Download</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-400 font-medium">Pending</p>
                  </div>
                )}
              </div>
            </div>

            {/* Cartoonized */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200/50 p-6 transition-all duration-300 hover:shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800">Cartoonized</h2>
                {cartoonUrl && (
                  <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                    Ready
                  </span>
                )}
              </div>
              <div className="relative aspect-square rounded-xl overflow-hidden bg-gradient-to from-purple-50 to-indigo-50 border border-gray-200">
                {cartoonUrl ? (
                  <div
                    className="relative w-full h-full group cursor-pointer select-none"
                    onClick={() => downloadImage(cartoonUrl, `cartoon-${Date.now()}.png`)}
                  >
                    <Image
                      src={cartoonUrl}
                      alt="cartoon"
                      fill
                      className="object-contain transition-transform duration-300 group-hover:scale-105 pointer-events-none"
                      unselectable="on"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-none">
                      <div className="text-center">
                        <svg className="w-10 h-10 text-white mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        <span className="text-white font-semibold text-sm">Click to Download</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-400 font-medium">Pending</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        {progress > 0 && (
          <div className="mb-8 bg-white rounded-xl shadow-lg border border-gray-200/50 p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-gray-700">Processing...</span>
              <span className="text-sm font-bold text-blue-600">{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
              <div
                className="bg-gradient- from-blue-500 via-purple-500 to-indigo-600 h-full transition-all duration-300 ease-out rounded-full shadow-lg"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200/50 p-6">
          <div className="flex flex-wrap justify-center bg gap-3">
            <button
              onClick={processImage}
              disabled={isProcessing || !selectedImage}
              className="group relative px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 disabled:hover:scale-100"
            >
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Remove Background
              </span>
            </button>

            {processedImage && (
              <>
                <button
                  onClick={handleCartoonize}
                  disabled={isProcessing}
                  className="px-6 py-3 bg-orange-400 text-white font-semibold rounded-xl shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 disabled:hover:scale-100"
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Convert to Cartoon
                  </span>
                </button>
                <button
                  onClick={() => downloadImage(processedImage, `bg-removed-${Date.now()}.png`)}
                  className="px-6 py-3 bg-green-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105"
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download BG-Removed
                  </span>
                </button>
              </>
            )}

            {cartoonUrl && (
              <button
                onClick={() => downloadImage(cartoonUrl, `cartoon-${Date.now()}.png`)}
                className="px-6 py-3 bg- bg-green-600 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105"
              >
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download Cartoon
                </span>
              </button>
            )}

            {(processedImage || cartoonUrl) && (
              <button
                onClick={resetAll}
                className="px-6 py-3 bg-gray-200 text-gray-800 font-semibold rounded-xl shadow-md hover:shadow-lg hover:bg-gray-300 transition-all duration-300 hover:scale-105"
              >
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Reset All
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}