'use client'

import { useQuery } from "@tanstack/react-query"
import Image from 'next/image'
import { getDynamicImageUrl } from "@/app/actions/storageActions"
import { Loader2 } from 'lucide-react'
import { useEffect } from 'react'

interface GcsImageProps {
  gcsUri: string | null
  alt: string
  className?: string
  fill?: boolean
  sizes?: string
}

const isDevelopment = process.env.NODE_ENV === 'development';

export function GcsImage({ gcsUri, alt, className, fill = true, sizes }: GcsImageProps) {
  const { data: imageData, isLoading, error } = useQuery({
    queryKey: ['gcs-image', gcsUri],
    queryFn: async () => {
      if (!gcsUri) return null;
      try {
        // 只在开发环境中输出调试日志
        if (isDevelopment) {
          console.log('Fetching image URL for:', gcsUri);
        }
        const result = await getDynamicImageUrl(gcsUri);
        if (isDevelopment) {
          console.log('Image URL result:', result);
        }
        return result;
      } catch (error) {
        // 只在开发环境中输出错误日志
        if (isDevelopment) {
          console.error('Error fetching image URL:', error);
        }
        // 返回一个错误状态而不是抛出异常，这样组件可以显示错误状态
        return { url: null, mimeType: null, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    },
    enabled: !!gcsUri,
    staleTime: 1000 * 60 * 50, // 50 minutes
    retry: 2, // 重试2次
  })

  const imageUrl = imageData?.url || null

  // Preload the image to avoid layout shift
  useEffect(() => {
    if (imageUrl) {
      const img = new window.Image()
      img.src = imageUrl
    }
  }, [imageUrl])

  if (isLoading) {
    return (
      <div className={`relative w-full h-full bg-gray-100 flex items-center justify-center ${className}`}>
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  // 检查是否有错误或者没有图片URL
  if (error || !imageUrl || (imageData && 'error' in imageData)) {
    const errorMessage = error?.message || (imageData && 'error' in imageData ? imageData.error : 'Failed to load image');
    // 只在开发环境中输出错误日志
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
        onError={(e) => {
          const target = e.target as HTMLImageElement
          target.src = "/placeholder.svg"
          target.onerror = null // Prevent infinite loop
        }}
      />
    </div>
  )
}