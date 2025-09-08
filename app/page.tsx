'use client'

import { Stepper } from "@/components/ui/stepper"
import { useScenario } from '@/hooks/use-scenario'
import { BookOpen, Film, LayoutGrid, Library, PenLine, Scissors } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { generateMusic } from "./actions/generate-music"
import { generateScenario, generateStoryboard } from './actions/generate-scenes'
import { exportMovieAction } from './actions/generate-video'
import { generateVoiceover } from "./actions/generate-voiceover"

import { resizeImage } from './actions/resize-image'
import { saveImageToPublic } from './actions/upload-image'
import { CreateTab } from './components/create/create-tab'
import { type Style } from "./components/create/style-selector"
import { EditorTab } from './components/editor/editor-tab'
import { Voice } from './components/editor/voice-selection-dialog'
import { ScenarioTab } from "./components/scenario/scenario-tab"
import { StoriesTab } from './components/stories/stories-tab'
import { StoryboardTab } from './components/storyboard/storyboard-tab'
import { UserProfile } from "./components/user-profile"
import { VideoTab } from './components/video/video-tab'
import { Scenario, Scene, TimelineLayer, type Language } from './types'
import { regenerateCharacterAndScenarioFromText, regenerateCharacterAndScenarioFromImage, regenerateSettingAndScenarioFromImage, regenerateSettingAndScenarioFromText, regeneratePropAndScenarioFromImage, regeneratePropAndScenarioFromText } from "./actions/modify-scenario"

const styles: Style[] = [
  { name: "Photographic", image: "/styles/cinematic.jpg" },
  { name: "2D Animation", image: "/styles/2d.jpg" },
  { name: "Anime", image: "/styles/anime.jpg" },
  { name: "3D Animation", image: "/styles/3d.jpg" },
  { name: "Claymation Animation", image: "/styles/claymation.jpg" },
]

const DEFAULT_LANGUAGE: Language = {
  name: "English (United States)",
  code: "en-US"
};

export default function Home() {
  const [pitch, setPitch] = useState('')
  const [name, setName] = useState('')
  const [style, setStyle] = useState('Photographic')
  const [aspectRatio, setAspectRatio] = useState('16:9')
  const [language, setLanguage] = useState<Language>(DEFAULT_LANGUAGE)
  const [logoOverlay, setLogoOverlay] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false);
  const [numScenes, setNumScenes] = useState(6)
  const [isLoading, setIsLoading] = useState(false)
  const [withVoiceOver, setWithVoiceOver] = useState(false)
  const [isVideoLoading, setIsVideoLoading] = useState(false)
  const [scenario, setScenario] = useState<Scenario>()
  const [generatingScenes, setGeneratingScenes] = useState<Set<number>>(new Set());
  const [generatingCharacterImages, setGeneratingCharacterImages] = useState<Set<number>>(new Set());
  const [generatingSettingImages, setGeneratingSettingImages] = useState<Set<number>>(new Set());
  const [generatingPropImages, setGeneratingPropImages] = useState<Set<number>>(new Set());
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [videoUri, setVideoUri] = useState<string | null>(null)
  const [vttUri, setVttUri] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<string>("stories")
  const [currentTime, setCurrentTime] = useState(0)
  const [isGeneratingMusic, setIsGeneratingMusic] = useState(false)
  const [isGeneratingVoiceover, setIsGeneratingVoiceover] = useState(false)
  const [selectedVoice, setSelectedVoice] = useState<Voice | null>(null)

  const GCS_VIDEOS_STORAGE_URI = process.env.GCS_VIDEOS_STORAGE_URI;

  // Scenario auto-save functionality
  const { saveScenarioDebounced, getCurrentScenarioId, setCurrentScenarioId, isAuthenticated } = useScenario()

  useEffect(() => {
    console.log("generatingScenes (in useEffect):", generatingScenes);
  }, [generatingScenes]); // Log only when generatingScenes changes

  useEffect(() => {
    console.log("generatingCharacterImages (in useEffect):", generatingCharacterImages);
  }, [generatingCharacterImages]); // Log only when generatingCharacterImages changes

  // Auto-save scenario whenever it changes (debounced)
  useEffect(() => {
    if (scenario && isAuthenticated) {
      console.log('Auto-saving scenario to Firestore...')
      saveScenarioDebounced(scenario, getCurrentScenarioId() || undefined)
    }
  }, [scenario, isAuthenticated, saveScenarioDebounced, getCurrentScenarioId])

  const handleGenerate = async (modelName: string = 'gemini-2.5-flash', thinkingBudget: number = 0) => {
    if (pitch.trim() === '' || numScenes < 1) return
    setIsLoading(true)
    setErrorMessage(null)
    try {
      const scenario = await generateScenario(name, pitch, numScenes, style, aspectRatio, language, modelName, thinkingBudget)
      setScenario(scenario)
      if (logoOverlay) {
        scenario.logoOverlay = logoOverlay
      }
      setActiveTab("scenario") // Switch to scenario tab after successful generation
    } catch (error) {
      console.error('Error generating scenes:', error)
      setErrorMessage(error instanceof Error ? error.message : 'An unknown error occurred while generating scenes')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegenerateImage = async (index: number) => {
    if (!scenario) return;

    setGeneratingScenes(prev => new Set([...prev, index]));
    setErrorMessage(null)
    try {
      // Regenerate a single image
      const scene = scenario.scenes[index]

      const response = await fetch('/api/regenerate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: scene.imagePrompt, scenario: scenario }),
      })

      const result = await response.json()

      const { imageGcsUri } = result
      const errorMessage = result.errorMessage

      // Use state updater function to work with current state
      setScenario(currentScenario => {
        if (!currentScenario) return currentScenario;

        const updatedScenes = [...currentScenario.scenes]
        updatedScenes[index] = {
          ...updatedScenes[index],
          imageGcsUri,
          videoUri: undefined,
          errorMessage: errorMessage
        }

        return {
          ...currentScenario,
          scenes: updatedScenes
        }
      })
    } catch (error) {
      console.error("Error regenerating images:", error)
      setErrorMessage(`${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setGeneratingScenes(prev => {
        const updated = new Set(prev);
        updated.delete(index); // Remove index from generatingScenes
        return updated;
      });
    }
  }

  const handleRegenerateCharacterImage = async (characterIndex: number, name: string, description: string) => {
    if (!scenario) return;

    setGeneratingCharacterImages(prev => new Set([...prev, characterIndex]));
    setErrorMessage(null)
    try {
      // Regenerate character image using the updated description
      const { updatedScenario: newScenarioText, newImageGcsUri } = await regenerateCharacterAndScenarioFromText(scenario.scenario, scenario.characters[characterIndex].name, name, description, style)


      // Update the character with the new image AND the updated description
      const updatedCharacters = [...scenario.characters];
      updatedCharacters[characterIndex] = {
        ...updatedCharacters[characterIndex],
        name: name, // Preserve the updated name
        description: description, // Preserve the updated description
        imageGcsUri: newImageGcsUri
      };

      const updatedScenario = {
        ...scenario,
        characters: updatedCharacters,
        scenario: newScenarioText
      };

      setScenario(updatedScenario);
    } catch (error) {
      console.error("Error regenerating character image:", error)
      setErrorMessage(`Failed to regenerate character image: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setGeneratingCharacterImages(prev => {
        const updated = new Set(prev);
        updated.delete(characterIndex);
        return updated;
      });
    }
  }

  const handleRegenerateSettingImage = async (settingIndex: number, name: string, description: string) => {
    if (!scenario) return;

    setGeneratingSettingImages(prev => new Set([...prev, settingIndex]));
    setErrorMessage(null)
    try {
      // Regenerate setting image using the updated description
      const { updatedScenario: newScenarioText, newImageGcsUri } = await regenerateSettingAndScenarioFromText(scenario.scenario, scenario.settings[settingIndex].name, name, description, style)


      // Update the setting with the new image AND the updated description
      const updatedSettings = [...scenario.settings];
      updatedSettings[settingIndex] = {
        ...updatedSettings[settingIndex],
        name: name, // Preserve the updated name
        description: description, // Preserve the updated description
        imageGcsUri: newImageGcsUri
      };

      const updatedScenario = {
        ...scenario,
        settings: updatedSettings,
        scenario: newScenarioText
      };

      setScenario(updatedScenario);
    } catch (error) {
      console.error("Error regenerating setting image:", error)
      setErrorMessage(`Failed to regenerate setting image: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setGeneratingSettingImages(prev => {
        const updated = new Set(prev);
        updated.delete(settingIndex);
        return updated;
      });
    }
  }

  const handleRegeneratePropImage = async (propIndex: number, name: string, description: string) => {
    if (!scenario) return;

    setGeneratingPropImages(prev => new Set([...prev, propIndex]));
    setErrorMessage(null)
    try {
      // Regenerate prop image using the updated description
      const { updatedScenario: newScenarioText, newImageGcsUri } = await regeneratePropAndScenarioFromText(scenario.scenario, scenario.props[propIndex].name, name, description, style)


      // Update the prop with the new image AND the updated description
      const updatedProps = [...scenario.props];
      updatedProps[propIndex] = {
        ...updatedProps[propIndex],
        name: name, // Preserve the updated name
        description: description, // Preserve the updated description
        imageGcsUri: newImageGcsUri
      };

      const updatedScenario = {
        ...scenario,
        props: updatedProps,
        scenario: newScenarioText
      };

      setScenario(updatedScenario);
    } catch (error) {
      console.error("Error regenerating prop image:", error)
      setErrorMessage(`Failed to regenerate prop image: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setGeneratingPropImages(prev => {
        const updated = new Set(prev);
        updated.delete(propIndex);
        return updated;
      });
    }
  }

  const handleExportMovie = async (layers: TimelineLayer[]) => {
    setIsVideoLoading(true)
    setErrorMessage(null)
    try {
      console.log('Export Movie');
      console.log(layers)
      const result = await exportMovieAction(
        layers
      );
      if (result.success) {
        setVideoUri(result.videoUrl)
        setVttUri(result.vttUrl || null)
        setActiveTab("video")
      } else {
        setVideoUri(null)
        setVttUri(null)
      }
    } catch (error) {
      console.error("Error generating video:", error)
      setErrorMessage(error instanceof Error ? error.message : "An unknown error occurred while generating video")
      setVttUri(null)
    } finally {
      setIsVideoLoading(false)
    }
  }

  const handleGenerateAllVideos = async (model: string = "veo-3.0-generate-001", generateAudio: boolean = true) => {
    if (!scenario) return;
    setErrorMessage(null);
    console.log("[Client] Generating videos for all scenes - START");
    setGeneratingScenes(new Set(scenario?.scenes.map((_, i) => i)));

    const regeneratedScenes = await Promise.all(
      scenario.scenes.map(async (scene) => {
        try {
          const response = await fetch('/api/videos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scenes: [scene], language: scenario?.language, aspectRatio: scenario?.aspectRatio, model, generateAudio }),
          });

          const { success, videoUrls, error } = await response.json();

          if (success) {
            return { ...scene, videoUri: videoUrls[0] || undefined };
          } else {
            throw new Error(error);
          }
        } catch (error) {
          console.error("Error regenerating video:", error);
          if (error instanceof Error) {
            return { ...scene, videoUri: undefined, errorMessage: error.message };
          } else {
            return { ...scene, videoUri: undefined };
          }
        }
      })
    );

    setScenario({
      ...scenario,
      scenes: regeneratedScenes
    });
    setGeneratingScenes(new Set());
    setActiveTab("editor")
  };

  const handleGenerateVoiceover = async (voice?: Voice) => {
    if (!scenario) return
    setIsGeneratingVoiceover(true)
    setErrorMessage(null)
    try {
      // Set the selected voice for future video generation
      if (voice) {
        setSelectedVoice(voice)
      }

      const scenesVoiceovers = scenario.scenes.map((scene) => ({
        voiceover: scene.voiceover
      }))
      const voiceoverAudioUrls = await generateVoiceover(scenesVoiceovers, scenario.language, voice?.name)
      const updatedScenes = scenario.scenes.map((scene, index) => ({
        ...scene,
        voiceoverAudioUri: voiceoverAudioUrls[index]
      }))
      setScenario({
        ...scenario,
        scenes: updatedScenes // Update scenario with the new scenes that include voiceover URLs
      })
    } catch (error) {
      console.error('Error generating voiceover:', error)
      setErrorMessage(error instanceof Error ? error.message : 'An unknown error occurred while generating voiceover')
    } finally {
      setIsGeneratingVoiceover(false)
    }
  }

  const handleGenerateMusic = async (musicParams?: { description: string }) => {
    if (!scenario) return
    setIsGeneratingMusic(true)
    setErrorMessage(null)
    try {
      // Update scenario with new music description if provided
      let updatedScenario = scenario
      if (musicParams) {
        updatedScenario = {
          ...scenario,
          music: musicParams.description
        }
        setScenario(updatedScenario)
      }

      const musicUrl = await generateMusic(updatedScenario.music)
      const finalScenario = {
        ...updatedScenario,
        musicUrl: musicUrl
      }
      setScenario(finalScenario)
      console.log(musicUrl)
    } catch (error) {
      console.error('Error generating music:', error)
      setErrorMessage(error instanceof Error ? error.message : 'An unknown error occurred while generating music')
    } finally {
      setIsGeneratingMusic(false)
    }
  }

  const handleGenerateStoryBoard = async () => {
    console.log("Generating storyboard");

    if (!scenario) return
    setIsLoading(true)
    setErrorMessage(null)
    try {
      const scenarioWithStoryboard = await generateStoryboard(scenario, numScenes, style, language)
      setScenario(scenarioWithStoryboard)
      setActiveTab("storyboard") // Switch to storyboard tab after successful generation
    } catch (error) {
      console.error('Error generating storyboard:', error)
      setErrorMessage(error instanceof Error ? error.message : 'An unknown error occurred while generating storyboard')
      setActiveTab("scenario") // Stay on scenario tab if there's an error
    } finally {
      setIsLoading(false)
    }
  }

  const handleGenerateVideo = async (index: number) => {
    if (!scenario) return;
    setErrorMessage(null);
    try {
      // Single scene generation logic remains the same
      setGeneratingScenes(prev => new Set([...prev, index]));
      const scene = scenario.scenes[index];
      console.log('scene', scene);

      const response = await fetch('/api/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenes: [scene], language: scenario?.language, aspectRatio: scenario?.aspectRatio }),
      });

      const { success, videoUrls, error } = await response.json();

      if (success) {
        const videoUri = success ? videoUrls[0] : undefined;

        // Use state updater function to work with current state
        setScenario(currentScenario => {
          if (!currentScenario) return currentScenario;

          const updatedScenes = [...currentScenario.scenes]
          updatedScenes[index] = { ...updatedScenes[index], videoUri, errorMessage: undefined }

          return {
            ...currentScenario,
            scenes: updatedScenes
          }
        });
      } else {
        throw new Error(error);
      }
    } catch (error) {
      console.error("[Client] Error generating video:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "An unknown error occurred while generating video"
      );

      // Use state updater function to work with current state
      setScenario(currentScenario => {
        if (!currentScenario) return currentScenario;

        const updatedScenes = currentScenario.scenes.map((s, i) => {
          if (i === index) {
            if (error instanceof Error) {
              return { ...s, videoUri: undefined, errorMessage: error.message }
            } else {
              return { ...s, videoUri: undefined }
            }
          } else {
            return s
          }
        });

        return {
          ...currentScenario,
          scenes: updatedScenes
        }

      });
    } finally {
      console.log(`[Client] Generating video done`);
      setGeneratingScenes(prev => {
        const updated = new Set(prev);
        updated.delete(index); // Remove index from generatingScenes
        return updated;
      });
    }
  };

  const handleUpdateScene = (index: number, updatedScene: Scene) => {
    if (!scenario) return;

    // Use state updater function to work with current state
    setScenario(currentScenario => {
      if (!currentScenario) return currentScenario;

      const newScenes = [...currentScenario.scenes]
      newScenes[index] = updatedScene

      return {
        ...currentScenario,
        scenes: newScenes
      }
    })
  };

  const handleUploadImage = async (index: number, file: File) => {
    setErrorMessage(null)
    try {
      const reader = new FileReader()
      reader.onloadend = async () => {
        const base64String = reader.result as string
        const imageBase64 = base64String.split(",")[1] // Remove the data URL prefix
        const resizedImageGcsUri = await resizeImage(imageBase64);

        // Use state updater function to work with current state
        setScenario(currentScenario => {
          if (!currentScenario) return currentScenario;

          const updatedScenes = [...currentScenario.scenes]
          updatedScenes[index] = { ...updatedScenes[index], imageGcsUri: resizedImageGcsUri, videoUri: undefined }

          return {
            ...currentScenario,
            scenes: updatedScenes
          }
        })
      }
      reader.onerror = () => {
        throw new Error("Failed to read the image file")
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error("Error uploading image:", error)
      setErrorMessage(error instanceof Error ? error.message : "An unknown error occurred while uploading the image")
    }
  }

  const handleUploadSettingImage = async (settingIndex: number, file: File) => {
    if (!scenario) return;

    console.log('Starting setting image upload for index:', settingIndex);
    setErrorMessage(null);
    setGeneratingSettingImages(prev => new Set(prev).add(settingIndex));

    try {
      const base64String = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.onerror = () => {
          reject(new Error("Failed to read the image file"));
        };
        reader.readAsDataURL(file);
      });

      const imageBase64 = base64String.split(",")[1]; // Remove the data URL prefix
      const resizedImageGcsUri = await resizeImage(imageBase64);

      const setting = scenario.settings[settingIndex];
      console.log('Calling regenerateSettingAndScenarioFromImage for setting:', setting.name);
      const result = await regenerateSettingAndScenarioFromImage(
        scenario.scenario,
        setting.name,
        setting.description,
        resizedImageGcsUri,
        scenario.settings,
        style
      );
      console.log('regenerateSettingAndScenarioFromImage completed successfully');

      // Update scenario with new setting description and scenario text
      setScenario(currentScenario => {
        if (!currentScenario) return currentScenario;

        const updatedSettings = [...currentScenario.settings];
        if (result.updatedSetting) {
          updatedSettings[settingIndex] = {
            ...updatedSettings[settingIndex],
            description: result.updatedSetting.description,
            name: result.updatedSetting.name,
            imageGcsUri: result.newImageGcsUri
          };
        }

        return {
          ...currentScenario,
          scenario: result.updatedScenario,
          settings: updatedSettings
        };
      });

    } catch (error) {
      console.error("Error uploading setting image:", error);
      setErrorMessage(error instanceof Error ? error.message : "An unknown error occurred while uploading the setting image");
    } finally {
      console.log('Finishing setting image upload for index:', settingIndex);
      setGeneratingSettingImages(prev => {
        const newSet = new Set(prev);
        newSet.delete(settingIndex);
        return newSet;
      });
    }
  }

  const handleUploadPropImage = async (propIndex: number, file: File) => {
    if (!scenario) return;

    console.log('Starting prop image upload for index:', propIndex);
    setErrorMessage(null);
    setGeneratingPropImages(prev => new Set(prev).add(propIndex));

    try {
      const base64String = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.onerror = () => {
          reject(new Error("Failed to read the image file"));
        };
        reader.readAsDataURL(file);
      });

      const imageBase64 = base64String.split(",")[1]; // Remove the data URL prefix
      const resizedImageGcsUri = await resizeImage(imageBase64);

      const prop = scenario.props[propIndex];
      console.log('Calling regeneratePropAndScenarioFromImage for prop:', prop.name);
      const result = await regeneratePropAndScenarioFromImage(
        scenario.scenario,
        prop.name,
        prop.description,
        resizedImageGcsUri,
        scenario.props,
        style
      );
      console.log('regeneratePropAndScenarioFromImage completed successfully');

      // Update scenario with new prop description and scenario text
      setScenario(currentScenario => {
        if (!currentScenario) return currentScenario;

        const updatedProps = [...currentScenario.props];
        if (result.updatedProp) {
          updatedProps[propIndex] = {
            ...updatedProps[propIndex],
            description: result.updatedProp.description,
            name: result.updatedProp.name,
            imageGcsUri: result.newImageGcsUri
          };
        }

        return {
          ...currentScenario,
          scenario: result.updatedScenario,
          props: updatedProps
        };
      });

    } catch (error) {
      console.error("Error uploading prop image:", error);
      setErrorMessage(error instanceof Error ? error.message : "An unknown error occurred while uploading the prop image");
    } finally {
      console.log('Finishing prop image upload for index:', propIndex);
      setGeneratingPropImages(prev => {
        const newSet = new Set(prev);
        newSet.delete(propIndex);
        return newSet;
      });
    }
  }

  const handleUploadCharacterImage = async (characterIndex: number, file: File) => {
    if (!scenario) return;

    console.log('Starting character image upload for index:', characterIndex);
    setErrorMessage(null);
    setGeneratingCharacterImages(prev => new Set(prev).add(characterIndex));

    try {
      const base64String = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.onerror = () => {
          reject(new Error("Failed to read the image file"));
        };
        reader.readAsDataURL(file);
      });

      const imageBase64 = base64String.split(",")[1]; // Remove the data URL prefix
      const resizedImageGcsUri = await resizeImage(imageBase64);

      const character = scenario.characters[characterIndex];
      console.log('Calling regenerateCharacterAndScenarioFromImage for character:', character.name);
      const result = await regenerateCharacterAndScenarioFromImage(
        scenario.scenario,
        character.name,
        character.description,
        resizedImageGcsUri,
        scenario.characters,
        style
      );
      console.log('regenerateCharacterAndScenarioFromImage completed successfully');

      // Update scenario with new character description and scenario text
      setScenario(currentScenario => {
        if (!currentScenario) return currentScenario;

        const updatedCharacters = [...currentScenario.characters];
        if (result.updatedCharacter) {
          updatedCharacters[characterIndex] = {
            ...updatedCharacters[characterIndex],
            description: result.updatedCharacter.description,
            name: result.updatedCharacter.name,
            imageGcsUri: result.newImageGcsUri
          };
        }

        return {
          ...currentScenario,
          scenario: result.updatedScenario,
          characters: updatedCharacters
        };
      });

    } catch (error) {
      console.error("Error uploading character image:", error);
      setErrorMessage(error instanceof Error ? error.message : "An unknown error occurred while uploading the character image");
    } finally {
      console.log('Finishing character image upload for index:', characterIndex);
      setGeneratingCharacterImages(prev => {
        const newSet = new Set(prev);
        newSet.delete(characterIndex);
        return newSet;
      });
    }
  };

  const handleLogoRemove = () => {
    setLogoOverlay(null);

    // Also remove logoOverlay from scenario if it exists
    if (scenario) {
      setScenario({
        ...scenario,
        logoOverlay: undefined
      });
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    try {
      // Convert file to base64 string
      const base64String = await fileToBase64(file);

      // Call server action to save the image
      const imagePath = await saveImageToPublic(base64String, file.name);

      // Update state with the path to the saved image
      console.log(imagePath)
      setLogoOverlay(imagePath);

      // Update scenario's logoOverlay if it exists
      if (scenario) {
        setScenario({
          ...scenario,
          logoOverlay: imagePath
        });
      }
    } catch (error) {
      console.error("Error uploading logo:", error);
    } finally {
      setIsUploading(false);
    }
  };

  // Utility function to convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  console.log("Component rendered");

  const steps = [
    {
      id: "stories",
      label: "Stories",
      icon: Library
    },
    {
      id: "create",
      label: "Create",
      icon: PenLine
    },
    {
      id: "scenario",
      label: "Scenario",
      icon: BookOpen,
      disabled: !scenario
    },
    {
      id: "storyboard",
      label: "Storyboard",
      icon: LayoutGrid,
      disabled: !scenario
    },
    {
      id: "editor",
      label: "Editor",
      icon: Scissors,
      disabled: !scenario || !scenario.scenes || !scenario.scenes.every(scene => scene.videoUri)
    },
    {
      id: "video",
      label: "Video",
      icon: Film,
      disabled: !scenario || !scenario.scenes || !scenario.scenes.every(scene => scene.videoUri)
    }
  ]

  const handleScenarioUpdate = (updatedScenario: Scenario) => {
    setScenario(updatedScenario);
  };

  const handleSelectScenario = (selectedScenario: Scenario, scenarioId?: string) => {
    // Set the scenario ID from Firestore for future saves
    if (scenarioId) {
      setCurrentScenarioId(scenarioId);
    }

    // Load the existing scenario data
    setScenario(selectedScenario);

    // Populate form fields with existing data
    setName(selectedScenario.name || '');
    setPitch(selectedScenario.pitch || '');
    setStyle(selectedScenario.style || 'Photographic');
    setLanguage(selectedScenario.language || DEFAULT_LANGUAGE);
    setNumScenes(selectedScenario.scenes?.length || 6);
    setLogoOverlay(selectedScenario.logoOverlay || null);

    // Check if all scenes have videos to determine which tab to show
    const allScenesHaveVideos = selectedScenario.scenes &&
      selectedScenario.scenes.length > 0 &&
      selectedScenario.scenes.every(scene => scene.videoUri);

    // Navigate to the appropriate tab based on the scenario's progress
    if (allScenesHaveVideos) {
      setActiveTab("editor"); // If videos are ready, go to editor
    } else if (selectedScenario.scenes && selectedScenario.scenes.length > 0) {
      setActiveTab("storyboard"); // If scenes exist, go to storyboard
    } else {
      setActiveTab("scenario"); // Otherwise, go to scenario
    }
  };

  const handleCreateNewStory = () => {
    // Reset all state for a new story
    setScenario(undefined);
    setPitch('');
    setStyle('Photographic');
    setLanguage(DEFAULT_LANGUAGE);
    setLogoOverlay(null);
    setNumScenes(6);
    setWithVoiceOver(false);
    setErrorMessage(null);
    setVideoUri(null);
    setVttUri(null);
    setCurrentTime(0);
    setSelectedVoice(null);

    // Clear the current scenario ID so a new one will be generated
    setCurrentScenarioId(null);

    // Navigate to the create tab
    setActiveTab("create");
  };

  const handleRemoveVoiceover = (sceneIndex: number) => {
    if (!scenario) return;

    // Create updated scenes with voiceover removed from the specific scene
    const updatedScenes = scenario.scenes.map((scene, index) => {
      if (index === sceneIndex) {
        return {
          ...scene,
          voiceoverAudioUri: undefined
        };
      }
      return scene;
    });

    // Update scenario with updated scenes
    setScenario({
      ...scenario,
      scenes: updatedScenes
    });
  };

  const handleRemoveMusic = () => {
    if (!scenario) return;

    // Remove music from scenario
    setScenario({
      ...scenario,
      musicUrl: undefined
    });
  };

  const createEmptyScene = (): Scene => {
    return {
      imagePrompt: {
        Style: scenario?.style || 'Photographic',
        Scene: 'A new scene to be described',
        Composition: {
          shot_type: 'Medium Shot',
          lighting: 'Natural lighting',
          overall_mood: 'Neutral'
        },
        Subject: [],
        Prop: [],
        Context: []
      },
      videoPrompt: {
        Action: 'Describe the action happening in this scene',
        Camera_Motion: 'Static camera',
        Ambiance_Audio: 'Natural ambient sounds',
        Dialogue: []
      },
      description: 'A new scene that needs to be developed',
      voiceover: 'Voiceover text for this scene',
      charactersPresent: []
    };
  };

  const handleAddScene = () => {
    if (!scenario) return;

    const newScene = createEmptyScene();
    const updatedScenes = [...scenario.scenes, newScene];

    setScenario({
      ...scenario,
      scenes: updatedScenes
    });
  };

  const handleRemoveScene = (index: number) => {
    if (!scenario || scenario.scenes.length <= 1) return;

    const updatedScenes = scenario.scenes.filter((_, i) => i !== index);

    // Clear any generating scenes that are affected by the removal
    setGeneratingScenes(prev => {
      const updated = new Set<number>();
      prev.forEach(sceneIndex => {
        if (sceneIndex < index) {
          updated.add(sceneIndex);
        } else if (sceneIndex > index) {
          updated.add(sceneIndex - 1);
        }
        // Skip the deleted scene index
      });
      return updated;
    });

    setScenario({
      ...scenario,
      scenes: updatedScenes
    });
  };

  const handleReorderScenes = (fromIndex: number, toIndex: number) => {
    if (!scenario || fromIndex === toIndex) return;

    const updatedScenes = [...scenario.scenes];
    const [movedScene] = updatedScenes.splice(fromIndex, 1);
    updatedScenes.splice(toIndex, 0, movedScene);

    // Update generating scenes indices
    setGeneratingScenes(prev => {
      const updated = new Set<number>();
      prev.forEach(sceneIndex => {
        let newIndex = sceneIndex;

        if (sceneIndex === fromIndex) {
          newIndex = toIndex;
        } else if (fromIndex < toIndex) {
          // Moving forward
          if (sceneIndex > fromIndex && sceneIndex <= toIndex) {
            newIndex = sceneIndex - 1;
          }
        } else {
          // Moving backward
          if (sceneIndex >= toIndex && sceneIndex < fromIndex) {
            newIndex = sceneIndex + 1;
          }
        }

        updated.add(newIndex);
      });
      return updated;
    });

    setScenario({
      ...scenario,
      scenes: updatedScenes
    });
  };

  return (
    <main className="container mx-auto p-8 min-h-screen bg-background flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-2">
          <Image
            src="/logo5.png"
            alt="Storycraft"
            width={32}
            height={32}
            className="h-8"
          />
          <h1 className="text-3xl font-bold text-primary ml-[-10px]">
            toryCraft
          </h1>
        </div>
        <UserProfile isCollapsed={false} />
      </div>
      <div className="flex-1 space-y-4">
        <Stepper
          steps={steps}
          currentStep={activeTab}
          onStepClick={setActiveTab}
          className="mb-8"
        />

        {activeTab === "stories" && (
          <StoriesTab
            onSelectScenario={handleSelectScenario}
            onCreateNewStory={handleCreateNewStory}
          />
        )}

        {activeTab === "create" && (
          <CreateTab
            name={name}
            setName={setName}
            pitch={pitch}
            setPitch={setPitch}
            numScenes={numScenes}
            setNumScenes={setNumScenes}
            style={style}
            setStyle={setStyle}
            aspectRatio={aspectRatio}
            setAspectRatio={setAspectRatio}
            language={language}
            setLanguage={setLanguage}
            isLoading={isLoading}
            errorMessage={errorMessage}
            onGenerate={(modelName, thinkingBudget) => handleGenerate(modelName, thinkingBudget)}
            styles={styles}
          />
        )}

        {activeTab === "scenario" && (
          <ScenarioTab
            scenario={scenario}
            onGenerateStoryBoard={handleGenerateStoryBoard}
            isLoading={isLoading}
            onScenarioUpdate={handleScenarioUpdate}
            onRegenerateCharacterImage={handleRegenerateCharacterImage}
            onUploadCharacterImage={handleUploadCharacterImage}
            generatingCharacterImages={generatingCharacterImages}
            onRegenerateSettingImage={handleRegenerateSettingImage}
            onUploadSettingImage={handleUploadSettingImage}
            generatingSettingImages={generatingSettingImages}
            onRegeneratePropImage={handleRegeneratePropImage}
            onUploadPropImage={handleUploadPropImage}
            generatingPropImages={generatingPropImages}
          />
        )}

        {activeTab === "storyboard" && scenario && (
          <StoryboardTab
            scenario={scenario}
            isVideoLoading={isVideoLoading}
            generatingScenes={generatingScenes}
            errorMessage={errorMessage}
            onGenerateAllVideos={(model, generateAudio) => handleGenerateAllVideos(model, generateAudio)}
            onUpdateScene={handleUpdateScene}
            onRegenerateImage={handleRegenerateImage}
            onGenerateVideo={handleGenerateVideo}
            onUploadImage={handleUploadImage}
            onAddScene={handleAddScene}
            onRemoveScene={handleRemoveScene}
            onReorderScenes={handleReorderScenes}
          />
        )}

        {activeTab === "editor" && scenario && (
          <EditorTab
            scenario={scenario}
            currentTime={currentTime}
            onTimeUpdate={setCurrentTime}
            onTimelineItemUpdate={(layerId, itemId, updates) => {
              // TODO: Implement timeline item updates
              console.log('Timeline item update:', { layerId, itemId, updates })
            }}
            logoOverlay={logoOverlay}
            setLogoOverlay={setLogoOverlay}
            onLogoUpload={handleLogoUpload}
            onLogoRemove={handleLogoRemove}
            onGenerateMusic={handleGenerateMusic}
            isGeneratingMusic={isGeneratingMusic}
            onGenerateVoiceover={handleGenerateVoiceover}
            isGeneratingVoiceover={isGeneratingVoiceover}
            onExportMovie={handleExportMovie}
            isExporting={isVideoLoading}
            onRemoveVoiceover={handleRemoveVoiceover}
            onRemoveMusic={handleRemoveMusic}
          />
        )}

        {activeTab === "video" && (
          <VideoTab
            videoGcsUri={videoUri}
            vttUri={vttUri}
            isVideoLoading={isVideoLoading}
            language={scenario?.language || DEFAULT_LANGUAGE}
          />
        )}
      </div>
      <footer className="mt-auto pt-8">
        <div className="flex items-center justify-center gap-2">
          <p className="text-sm text-muted-foreground">
            Made with ❤️ by @mblanc
          </p>
        </div>
      </footer>
    </main>
  )
}

