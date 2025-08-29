"use client"

import { useRef, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { getDynamicImageUrl } from "@/app/actions/storageActions"
import { Loader2 } from 'lucide-react'

interface VideoPlayerProps {
  videoGcsUri: string | null
  vttSrc?: string | null
  language?: { name: string; code: string }
}

export function VideoPlayer({ videoGcsUri, vttSrc, language }: VideoPlayerProps) {
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
        <div className="relative w-full aspect-video bg-gray-100 rounded-lg shadow-lg flex items-center justify-center">
          <Loader2 className="h-12 w-12 text-gray-400 animate-spin" />
        </div>
      </div>
    )
  }

  if (!videoUrl) {
    return (
      <div className="w-full max-w-3xl mx-auto">
        <div className="relative w-full aspect-video bg-gray-100 rounded-lg shadow-lg flex items-center justify-center">
          <p className="text-gray-500">Video not available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
      <video ref={videoRef} controls className="w-full rounded-lg shadow-lg">
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

