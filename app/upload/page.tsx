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

  // Scroll to top on error
  useEffect(() => {
    if (failedStep) window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [failedStep]);

  // Unified download function
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
      form.append('image', blob, 'image.png');

      const response = await axios.post('http://localhost:5000/api/cartoonize', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

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
    <div className="p-6 sm:p-8 bg-gray-100 min-h-screen">
      <ToastContainer position="top-right" autoClose={2000} />

      <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">
        Background Remover & Cartoonizer
      </h1>

      {/* Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors
          ${isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white'}`}
      >
        <input
          type="file"
          accept="image/*,.heic,.heif"
          ref={fileInputRef}
          onChange={handleFileInputChange}
          className="hidden"
          id="uploadInput"
        />
        <label htmlFor="uploadInput" className="cursor-pointer text-blue-600 font-semibold">
          Click or drag & drop to upload
        </label>
        <p className="text-sm text-gray-500 mt-1">JPG, PNG, HEIC – max 10 MB</p>
      </div>

      {/* Image Previews */}
      {originalPreview && (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="text-center">
            <h2 className="font-semibold mb-2 text-gray-700">Original</h2>
            <Image
              src={originalPreview}
              alt="original"
              width={300}
              height={300}
              className="rounded-md shadow-md mx-auto"
            />
            <p className="text-xs text-gray-600 mt-1">{imageDimensions.width} × {imageDimensions.height}</p>
          </div>

          {/* Background Removed - No Selection */}
          <div className="text-center">
            <h2 className="font-semibold mb-2 text-gray-700">Background Removed</h2>
            {processedImage ? (
              <div
                className="relative group cursor-pointer select-none"
                onClick={() => downloadImage(processedImage, `bg-removed-${Date.now()}.png`)}
              >
                <Image
                  src={processedImage}
                  alt="bg-removed"
                  width={300}
                  height={300}
                  className="rounded-md shadow-md mx-auto transition-transform group-hover:scale-105 pointer-events-none"
                  unselectable="on"
                />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity  bg-opacity-40 rounded-md pointer-events-none">
                  <span className="text-white font-medium text-sm">Click to Download</span>
                </div>
              </div>
            ) : (
              <p className="text-gray-400">—</p>
            )}
            {processedImage && (
              <p className="text-xs text-gray-600 mt-1">{processedDimensions.width} × {processedDimensions.height}</p>
            )}
          </div>

          
          <div className="text-center">
            <h2 className="font-semibold mb-2 text-gray-700">Cartoonized</h2>
            {cartoonUrl ? (
              <div
                className="relative group cursor-pointer select-none"
                onClick={() => downloadImage(cartoonUrl, `cartoon-${Date.now()}.png`)}
              >
                <Image
                  src={cartoonUrl}
                  alt="cartoon"
                  width={300}
                  height={300}
                  className="rounded-md shadow-md mx-auto transition-transform group-hover:scale-105 pointer-events-none"
                  unselectable="on"
                />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity  bg-opacity-40 rounded-md pointer-events-none">
                  <span className="text-white font-medium text-sm">Click to Download</span>
                </div>
              </div>
            ) : (
              <p className="text-gray-400">—</p>
            )}
          </div>
        </div>
      )}

      
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          onClick={processImage}
          disabled={isProcessing || !selectedImage}
          className="bg-blue-600 text-white px-5 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          Remove Background
        </button>

        {processedImage && (
          <>
            <button
              onClick={handleCartoonize}
              disabled={isProcessing}
              className="bg-purple-600 text-white px-5 py-2 rounded-md hover:bg-purple-700 disabled:opacity-50"
            >
              Convert to Cartoon
            </button>
            <button
              onClick={() => downloadImage(processedImage, `bg-removed-${Date.now()}.png`)}
              className="bg-green-600 text-white px-5 py-2 rounded-md hover:bg-green-700"
            >
              Download BG-Removed
            </button>
          </>
        )}

        {cartoonUrl && (
          <button
            onClick={() => downloadImage(cartoonUrl, `cartoon-${Date.now()}.png`)}
            className="bg-indigo-600 text-white px-5 py-2 rounded-md hover:bg-indigo-700"
          >
            Download Cartoon
          </button>
        )}

        <button
          onClick={resetAll}
          className="bg-gray-300 text-gray-800 px-5 py-2 rounded-md hover:bg-gray-400"
        >
          Reset
        </button>
      </div>

      
      {progress > 0 && (
        <div className="mt-6 w-full max-w-md mx-auto">
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-600 h-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-center mt-1 text-sm text-gray-600">{Math.round(progress)}%</p>
        </div>
      )}

      
      {failedStep && (
        <div className="mt-4 text-center">
          <button
            onClick={handleRetry}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry {failedStep === 'bg' ? 'Background Removal' : 'Cartoonization'}
          </button>
        </div>
      )}
    </div>
  );
}