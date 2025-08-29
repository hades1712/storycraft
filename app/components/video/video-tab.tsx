'use client'

import { Button } from '@/components/ui/button'
import { VideoPlayer } from "./video-player"
import { Download, Loader2 } from 'lucide-react'
import { useState } from 'react'

interface VideoTabProps {
  videoGcsUri: string | null
  vttUri: string | null
  isVideoLoading: boolean
  language: { name: string; code: string }
}

export function VideoTab({
  videoGcsUri,
  vttUri,
  isVideoLoading,
  language
}: VideoTabProps) {
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownload = async () => {
    if (!videoGcsUri) return

    try {
      setIsDownloading(true)
      
      // Note: For GCS URIs, we'd need to resolve to signed URL first
      // This is a simplified version - in production you might want to 
      // resolve the GCS URI to a signed URL for downloading
      const link = document.createElement('a')
      link.href = videoGcsUri
      
      // Extract filename from URI or use a default name
      const filename = videoGcsUri.split('/').pop() || 'video.mp4'
      link.download = filename
      
      // Append to body, click, and remove
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Error downloading video:', error)
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header with Download button */}
      <div className="flex justify-end">
        {videoGcsUri && (
          <Button
            onClick={handleDownload}
            disabled={isDownloading}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isDownloading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Downloading...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Download Movie
              </>
            )}
          </Button>
        )}
      </div>

      {videoGcsUri && (
        <div className="mb-8">
          <VideoPlayer videoGcsUri={videoGcsUri} vttSrc={vttUri} language={language} />
        </div>
      )}
    </div>
  )
} 