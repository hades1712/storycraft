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
    queryKey: ['image', gcsUri],
    queryFn: async () => {
      console.log('GcsImage query ' + gcsUri)
      if (!gcsUri) {
        return null
      }
      if (!gcsUri.startsWith('gs://')) {
        console.error('Invalid GCS URI format:', gcsUri)
        return null
      }
      try {
        const result = await getDynamicImageUrl(gcsUri)
        return result
      } catch (error) {
        console.error('Error fetching image URL:', error)
        throw error
      }
    },
    enabled: !!gcsUri,
    staleTime: isDevelopment ? 0 : 60 * 1000 * 50, // 50 minutes in production
  })

  const imageUrl = imageData?.url || null

  // Preload the image when we have the URL
  useEffect(() => {
    if (imageUrl) {
      const img = new window.Image()
      img.src = imageUrl
    }
  }, [imageUrl])

  if (isLoading) {
    return (
      <div className={`relative w-full h-full bg-gray-100 ${className}`}>
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-10">
          <Loader2 className="h-12 w-12 text-white animate-spin" />
        </div>
        <Image
          src="/placeholder.svg"
          alt={`Loading ${alt}`}
          className={className}
          fill={fill}
          sizes={sizes}
        />
      </div>
    )
  }

  if (!imageUrl) {
    return (
      <div className={`relative w-full h-full bg-gray-100 ${className}`}>
        <Image
          src="/placeholder.svg"
          alt={alt}
          className={className}
          fill={fill}
          sizes={sizes}
          onError={(e) => {
            const target = e.target as HTMLImageElement
            target.src = "/placeholder.svg"
            target.onerror = null // Prevent infinite loop
          }}
        />
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