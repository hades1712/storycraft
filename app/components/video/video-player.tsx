"use client"

import { useRef, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { getDynamicImageUrl } from "@/app/actions/storageActions"
import { Loader2 } from 'lucide-react'

interface VideoPlayerProps {
  videoGcsUri: string | null
  vttSrc?: string | null
  language?: { name: string; code: string }
  aspectRatio?: string
}

export function VideoPlayer({ videoGcsUri, vttSrc, language, aspectRatio = '16:9' }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  const { data: videoData, isLoading, error } = useQuery({
    queryKey: ['video', videoGcsUri],
    queryFn: async () => {
      if (!videoGcsUri) {
        return null
      }
      if (!videoGcsUri.startsWith('gs://')) {
        console.error('Invalid GCS URI format:', videoGcsUri)
        return null
      }
      try {
        const result = await getDynamicImageUrl(videoGcsUri)
        return result
      } catch (error) {
        console.error('Error fetching video URL:', error)
        throw error
      }
    },
    enabled: !!videoGcsUri,
  })

  const videoUrl = videoData?.url || null

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load()
    }
  }, [videoUrl, vttSrc])

  if (isLoading) {
    return (
      <div className="w-full max-w-3xl mx-auto">
        <div className={`relative w-full bg-black rounded-lg shadow-lg flex items-center justify-center ${
          aspectRatio === '9:16' ? 'aspect-[9/16]' : 'aspect-video'
        }`}>
          <Loader2 className="h-12 w-12 text-white animate-spin" />
        </div>
      </div>
    )
  }

  if (!videoUrl) {
    return (
      <div className="w-full max-w-3xl mx-auto">
        <div className={`relative w-full bg-black rounded-lg shadow-lg flex items-center justify-center ${
          aspectRatio === '9:16' ? 'aspect-[9/16]' : 'aspect-video'
        }`}>
          <p className="text-gray-300">Video not available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
      <video 
        ref={videoRef} 
        controls 
        className={`w-full rounded-lg shadow-lg object-contain bg-black ${
          aspectRatio === '9:16' ? 'aspect-[9/16]' : 'aspect-video'
        }`}
      >
        <source src={videoUrl} type="video/mp4" />
        {vttSrc && (
          <track
            src={vttSrc}
            kind="subtitles"
            srcLang={language?.code}
            label={language?.name}
            default
          />
        )}
        Your browser does not support the video tag.
      </video>
    </div>
  )
}

