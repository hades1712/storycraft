'use client'

import { useQuery } from "@tanstack/react-query"
import Image from 'next/image'
import { getDynamicImageUrl } from "@/app/actions/storageActions"
import { Loader2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface GcsImageProps {
  gcsUri: string | null
  alt: string
  className?: string
  fill?: boolean
  sizes?: string
}

const isDevelopment = process.env.NODE_ENV === 'development';

export function GcsImage({ gcsUri, alt, className, fill = true, sizes }: GcsImageProps) {
  const [forcedUrl, setForcedUrl] = useState<string | null>(null);
  const hasForcedOnce = useRef(false); // 防止无限强制刷新

  const { data: imageData, isLoading, error, refetch } = useQuery({
    queryKey: ['gcs-image', gcsUri],
    queryFn: async () => {
      if (!gcsUri) return null;
      try {
        if (isDevelopment) {
          console.log('Fetching image URL for:', gcsUri);
        }
        const result = await getDynamicImageUrl(gcsUri);
        if (isDevelopment) {
          console.log('Image URL result:', result);
        }
        return result;
      } catch (error) {
        if (isDevelopment) {
          console.error('Error fetching image URL:', error);
        }
        return { url: null, mimeType: null, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    },
    enabled: !!gcsUri,
    staleTime: 1000 * 60 * 50, // 50 minutes
    retry: 2,
  })

  const imageUrl = forcedUrl || imageData?.url || null

  // Preload the image to avoid layout shift
  useEffect(() => {
    if (imageUrl) {
      const img = new window.Image()
      img.src = imageUrl
    }
  }, [imageUrl])

  // 当检测到加载失败时，尝试强制刷新一次签名URL
  const handleImageError = async (e: any) => {
    const target = e.target as HTMLImageElement;
    if (!gcsUri) return;

    // 仅强制刷新一次，避免循环
    if (!hasForcedOnce.current) {
      hasForcedOnce.current = true;
      try {
        const refreshed = await getDynamicImageUrl(gcsUri, false, { forceRefresh: true });
        if (refreshed?.url) {
          setForcedUrl(refreshed.url);
          // 重新尝试加载
          target.src = refreshed.url;
          return;
        }
      } catch (err) {
        if (isDevelopment) {
          console.error('Force refresh image URL failed:', err);
        }
      }
    }

    // 兜底占位符
    target.src = "/placeholder.svg";
    target.onerror = null; // 防止无限循环
  };

  if (isLoading) {
    return (
      <div className={`relative w-full h-full bg-gray-100 flex items-center justify-center ${className}`}>
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  // 检查是否有错误或者没有图片URL
  if (error || !imageUrl || (imageData && 'error' in imageData)) {
    const errorMessage = (error as any)?.message || (imageData && 'error' in imageData ? (imageData as any).error : 'Failed to load image');
    if (isDevelopment) {
      console.error('GcsImage error:', errorMessage);
    }
    return (
      <div className={`relative w-full h-full bg-gray-100 flex items-center justify-center ${className}`}>
        <div className="text-center p-4">
          <div className="text-gray-400 text-sm mb-2">图片加载失败</div>
          {isDevelopment && (
            <div className="text-xs text-red-500 break-all">
              {errorMessage}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={`relative w-full h-full bg-black ${className}`}>
      <Image
        src={imageUrl}
        alt={alt}
        className={className}
        fill={fill}
        sizes={sizes}
        priority
        onError={handleImageError}
      />
    </div>
  )
}