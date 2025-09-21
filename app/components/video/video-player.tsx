"use client"

import { useRef, useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { getDynamicImageUrl } from "@/app/actions/storageActions"
import { Loader2 } from 'lucide-react'

interface VideoPlayerProps {
  videoGcsUri: string | null
  vttSrc?: string | null
  language?: { name: string; code: string }
  aspectRatio?: string
}

const isDevelopment = process.env.NODE_ENV === 'development';

export function VideoPlayer({ videoGcsUri, vttSrc, language, aspectRatio = '16:9' }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [forcedUrl, setForcedUrl] = useState<string | null>(null)
  const [hasForcedOnce, setHasForcedOnce] = useState(false) // 防止无限刷新

  const { data: videoData, isLoading, error, refetch } = useQuery({
    queryKey: ['video', videoGcsUri],
    queryFn: async () => {
      if (!videoGcsUri) return null
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

  const videoUrl = forcedUrl || videoData?.url || null

  useEffect(() => {
    if (videoRef.current) {
      // URL变化时强制 reload
      videoRef.current.load()
    }
  }, [videoUrl, vttSrc])

  // 视频播放错误处理：尝试强制刷新一次签名URL并重试加载
  const handleVideoError = async () => {
    if (!videoGcsUri || hasForcedOnce) return
    setHasForcedOnce(true)
    try {
      const refreshed = await getDynamicImageUrl(videoGcsUri, false, { forceRefresh: true })
      if (refreshed?.url && videoRef.current) {
        if (isDevelopment) {
          console.log('Video URL refreshed, retrying video load')
        }
        setForcedUrl(refreshed.url)
        // 设置新源并重载
        const v = videoRef.current
        // 清除现有 sources
        while (v.firstChild) v.removeChild(v.firstChild)
        const source = document.createElement('source')
        source.src = refreshed.url
        source.type = 'video/mp4'
        v.appendChild(source)
        v.load()
        // 自动尝试播放（如果用户手势允许）
        try { await v.play() } catch (_) {}
      }
    } catch (e) {
      if (isDevelopment) {
        console.error('Force refresh video URL failed:', e)
      }
    }
  }

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
        crossOrigin="anonymous" 
        className={`w-full rounded-lg shadow-lg object-contain bg-black ${
          aspectRatio === '9:16' ? 'aspect-[9/16]' : 'aspect-video'
        }`}
        onError={handleVideoError}
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

