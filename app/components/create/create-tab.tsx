'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { BookOpen, Loader2, ChevronDown } from 'lucide-react'
import { type Language } from '../../types'
import { StyleSelector, type Style } from "./style-selector"

const LANGUAGES: Language[] = [
  { name: "Arabic (Generic)", code: "ar-XA" },
  { name: "Bengali (India)", code: "bn-IN" },
  { name: "Dutch (Belgium)", code: "nl-BE" },
  { name: "Dutch (Netherlands)", code: "nl-NL" },
  { name: "English (Australia)", code: "en-AU" },
  { name: "English (India)", code: "en-IN" },
  { name: "English (United Kingdom)", code: "en-GB" },
  { name: "English (United States)", code: "en-US" },
  { name: "French (Canada)", code: "fr-CA" },
  { name: "French (France)", code: "fr-FR" },
  { name: "German (Germany)", code: "de-DE" },
  { name: "Gujarati (India)", code: "gu-IN" },
  { name: "Hindi (India)", code: "hi-IN" },
  { name: "Indonesian (Indonesia)", code: "id-ID" },
  { name: "Italian (Italy)", code: "it-IT" },
  { name: "Japanese (Japan)", code: "ja-JP" },
  { name: "Kannada (India)", code: "kn-IN" },
  { name: "Korean (South Korea)", code: "ko-KR" },
  { name: "Malayalam (India)", code: "ml-IN" },
  { name: "Mandarin Chinese (China)", code: "cmn-CN" },
  { name: "Marathi (India)", code: "mr-IN" },
  { name: "Polish (Poland)", code: "pl-PL" },
  { name: "Portuguese (Brazil)", code: "pt-BR" },
  { name: "Russian (Russia)", code: "ru-RU" },
  { name: "Spanish (Spain)", code: "es-ES" },
  { name: "Spanish (United States)", code: "es-US" },
  { name: "Swahili (Kenya)", code: "sw-KE" },
  { name: "Tamil (India)", code: "ta-IN" },
  { name: "Telugu (India)", code: "te-IN" },
  { name: "Thai (Thailand)", code: "th-TH" },
  { name: "Turkish (Turkey)", code: "tr-TR" },
  { name: "Ukrainian (Ukraine)", code: "uk-UA" },
  { name: "Urdu (India)", code: "ur-IN" },
  { name: "Vietnamese (Vietnam)", code: "vi-VN" }
];

const ASPECT_RATIOS = [
  { name: "16:9", value: "16:9", icon: "aspect-video" },
  { name: "9:16", value: "9:16", icon: "aspect-square" }
];

const MODEL_OPTIONS = [
  { 
    label: "Generate Scenario with Gemini 2.5 Flash", 
    modelName: "gemini-2.5-flash", 
    thinkingBudget: 0 
  },
  { 
    label: "Generate Scenario with Gemini 2.5 Flash Thinking", 
    modelName: "gemini-2.5-flash", 
    thinkingBudget: -1 
  },
  { 
    label: "Generate Scenario with Gemini 2.5 Pro", 
    modelName: "gemini-2.5-pro", 
    thinkingBudget: 0 
  },
  { 
    label: "Generate Scenario with Gemini 2.5 Pro Thinking", 
    modelName: "gemini-2.5-pro", 
    thinkingBudget: -1 
  }
];

interface CreateTabProps {
  name: string
  setName: (name: string) => void
  pitch: string
  setPitch: (pitch: string) => void
  numScenes: number
  setNumScenes: (num: number) => void
  style: string
  setStyle: (style: string) => void
  aspectRatio: string
  setAspectRatio: (aspectRatio: string) => void
  language: Language
  setLanguage: (language: Language) => void
  isLoading: boolean
  errorMessage: string | null
  onGenerate: (modelName: string, thinkingBudget: number) => Promise<void>
  styles: Style[]
}

export function CreateTab({
  name,
  setName,
  pitch,
  setPitch,
  numScenes,
  setNumScenes,
  style,
  setStyle,
  aspectRatio,
  setAspectRatio,
  language,
  setLanguage,
  isLoading,
  errorMessage,
  onGenerate,
  styles,
}: CreateTabProps) {
  const [selectedModel, setSelectedModel] = useState(MODEL_OPTIONS[0])
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const handleGenerateClick = () => {
    onGenerate(selectedModel.modelName, selectedModel.thinkingBudget)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <div className="flex">
          <Button
            onClick={handleGenerateClick}
            disabled={isLoading || pitch.trim() === '' || name.trim() === ''}
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-r-none"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <BookOpen className="mr-2 h-4 w-4" />
                {selectedModel.label}
              </>
            )}
          </Button>
          <Popover open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="px-2 border-l-0 rounded-l-none"
                disabled={isLoading || pitch.trim() === '' || name.trim() === ''}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <div className="py-1">
                {MODEL_OPTIONS.map((option, index) => (
                  <button
                    key={index}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center"
                    onClick={() => {
                      setSelectedModel(option)
                      setIsDropdownOpen(false)
                    }}
                  >
                    <BookOpen className="mr-2 h-4 w-4" />
                    {option.label}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      <div className='max-w-xl mx-auto '>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Give your story a name</h2>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter story name..."
            className="mb-4"
          />
          <h2 className="text-xl font-semibold">Enter your story pitch</h2>
          <p className="text-muted-foreground">
            Describe your story idea and we&apos;ll generate a complete storyboard with scenes, descriptions, and voiceover text.
          </p>
        </div>
        <div className="space-y-4">
          <Textarea
            value={pitch}
            onChange={(e) => setPitch(e.target.value)}
            placeholder="Once upon a time..."
            className="min-h-[100px]"
            rows={4} />
          <div className="flex items-center space-x-2">
            <label htmlFor="language" className="text-sm font-medium">
              Language:
            </label>
            <Select
              value={language.code}
              onValueChange={(code) => {
                const selectedLanguage = LANGUAGES.find(lang => lang.code === code);
                if (selectedLanguage) {
                  setLanguage(selectedLanguage);
                }
              }}
            >
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Select language">
                  {language.name}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2">
            <label htmlFor="numScenes" className="text-sm font-medium">
              Number of Scenes:
            </label>
            <Input
              id="numScenes"
              type="number"
              min="1"
              max="8"
              value={numScenes}
              onChange={(e) => setNumScenes(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
              className="w-20"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Aspect Ratio:</label>
            <div className="flex space-x-6">
              {ASPECT_RATIOS.map((ratio) => (
                <div key={ratio.value} className="flex flex-col items-center space-y-2">
                  <div
                    className={`w-16 h-16 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-colors ${
                      aspectRatio === ratio.value
                        ? 'bg-primary border-primary text-primary-foreground'
                        : 'border-gray-300 bg-white hover:border-gray-400'
                    }`}
                    onClick={() => setAspectRatio(ratio.value)}
                  >
                    <div
                      className={`border-2 rounded-sm flex items-center justify-center transition-colors ${
                        aspectRatio === ratio.value
                          ? 'border-primary-foreground bg-primary-foreground'
                          : 'border-gray-600 bg-gray-600'
                      }`}
                      style={{
                        aspectRatio: ratio.value === '16:9' ? '16/9' : '9/16',
                        width: ratio.value === '16:9' ? '36px' : '20px',
                        height: ratio.value === '16:9' ? '20px' : '36px'
                      }}
                    />
                  </div>
                  <span className="text-xs text-gray-600">{ratio.name}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <StyleSelector styles={styles} onSelect={setStyle} />
          </div>
          <div className="flex items-center space-x-2">
            <label htmlFor="style" className="text-sm font-medium">
              Style:
            </label>
            <Input
              id="style"
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              className="w-200"
            />
          </div>
          {errorMessage && (
            <div className="mt-4 p-8 bg-red-100 border border-red-400 text-red-700 rounded whitespace-pre-wrap">
              {errorMessage}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 