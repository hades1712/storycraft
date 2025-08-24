'use client'

import { Button } from "@/components/ui/button"
import { LayoutGrid, Loader2, Pencil, Upload } from "lucide-react";
import { Scenario } from "../../types";
import { useState, useRef, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { GcsImage } from "../ui/gcs-image";
import { regenerateScenarioFromSetting } from "../../actions/regenerate-scenario-from-settings";

interface ScenarioTabProps {
    scenario?: Scenario;
    onGenerateStoryBoard: () => void;
    isLoading: boolean;
    onScenarioUpdate?: (updatedScenario: Scenario) => void;
    onRegenerateCharacterImage?: (characterIndex: number, name: string, description: string) => Promise<void>;
    onUploadCharacterImage?: (characterIndex: number, file: File) => Promise<void>;
    generatingCharacterImages?: Set<number>;
    generatingSettings?: Set<number>;
}

export function ScenarioTab({ scenario, onGenerateStoryBoard, isLoading, onScenarioUpdate, onRegenerateCharacterImage, onUploadCharacterImage, generatingCharacterImages, generatingSettings }: ScenarioTabProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editedScenario, setEditedScenario] = useState(scenario?.scenario || '');
    const [isScenarioHovering, setIsScenarioHovering] = useState(false);
    const [editingCharacterIndex, setEditingCharacterIndex] = useState<number | null>(null);
    const [editedCharacterDescriptions, setEditedCharacterDescriptions] = useState<string[]>([]);
    const [characterHoverStates, setCharacterHoverStates] = useState<boolean[]>([]);
    const [editingSettingIndex, setEditingSettingIndex] = useState<number | null>(null);
    const [editedSettingDescriptions, setEditedSettingDescriptions] = useState<string[]>([]);
    const [settingHoverStates, setSettingHoverStates] = useState<boolean[]>([]);
    const [localGeneratingSettings, setLocalGeneratingSettings] = useState<Set<number>>(new Set());
    const [isEditingMusic, setIsEditingMusic] = useState(false);
    const [editedMusic, setEditedMusic] = useState('');
    const [isMusicHovering, setIsMusicHovering] = useState(false);
    const scenarioRef = useRef<HTMLDivElement>(null);
    const characterEditingRefs = useRef<(HTMLDivElement | null)[]>([]);
    const characterFileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const settingEditingRefs = useRef<(HTMLDivElement | null)[]>([]);
    const musicRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scenario?.scenario) {
            setEditedScenario(scenario.scenario);
        }
        if (scenario?.characters) {
            setEditedCharacterDescriptions(scenario.characters.map(char => char.description));
            // Initialize refs array for character editing areas
            characterEditingRefs.current = new Array(scenario.characters.length).fill(null);
            // Initialize refs array for character file inputs
            characterFileInputRefs.current = new Array(scenario.characters.length).fill(null);
            // Initialize hover states for characters
            setCharacterHoverStates(new Array(scenario.characters.length).fill(false));
        }
        if (scenario?.settings) {
            setEditedSettingDescriptions(scenario.settings.map(setting => setting.description));
            // Initialize refs array for setting editing areas
            settingEditingRefs.current = new Array(scenario.settings.length).fill(null);
            // Initialize hover states for settings
            setSettingHoverStates(new Array(scenario.settings.length).fill(false));
        }
        if (scenario?.music) {
            setEditedMusic(scenario.music);
        }
    }, [scenario?.scenario, scenario?.characters, scenario?.settings, scenario?.music]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            const target = event.target as Node;
            
            // Check if click is outside scenario editing area
            if (scenarioRef.current && !scenarioRef.current.contains(target)) {
                if (isEditing) {
                    handleSave();
                }
            }
            
            // Check if click is outside character editing area
            if (editingCharacterIndex !== null) {
                const currentCharacterRef = characterEditingRefs.current[editingCharacterIndex];
                if (currentCharacterRef && !currentCharacterRef.contains(target)) {
                    handleSaveCharacter(editingCharacterIndex);
                }
            }
            
            // Check if click is outside setting editing area
            if (editingSettingIndex !== null) {
                const currentSettingRef = settingEditingRefs.current[editingSettingIndex];
                if (currentSettingRef && !currentSettingRef.contains(target)) {
                    handleSaveSetting(editingSettingIndex);
                }
            }
            
            // Check if click is outside music editing area
            if (musicRef.current && !musicRef.current.contains(target)) {
                if (isEditingMusic) {
                    handleSaveMusic();
                }
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isEditing, editedScenario, editingCharacterIndex, editedCharacterDescriptions, editingSettingIndex, editedSettingDescriptions, isEditingMusic, editedMusic]);

    const handleScenarioChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setEditedScenario(e.target.value);
    };

    const handleCharacterDescriptionChange = (index: number, value: string) => {
        const newDescriptions = [...editedCharacterDescriptions];
        newDescriptions[index] = value;
        setEditedCharacterDescriptions(newDescriptions);
    };

    const handleCharacterHover = (index: number, isHovering: boolean) => {
        const newHoverStates = [...characterHoverStates];
        newHoverStates[index] = isHovering;
        setCharacterHoverStates(newHoverStates);
    };

    const handleSettingDescriptionChange = (index: number, value: string) => {
        const newDescriptions = [...editedSettingDescriptions];
        newDescriptions[index] = value;
        setEditedSettingDescriptions(newDescriptions);
    };

    const handleSettingHover = (index: number, isHovering: boolean) => {
        const newHoverStates = [...settingHoverStates];
        newHoverStates[index] = isHovering;
        setSettingHoverStates(newHoverStates);
    };

    const handleMusicChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setEditedMusic(e.target.value);
    };

    const handleCharacterUploadClick = (index: number) => {
        characterFileInputRefs.current[index]?.click();
    };

    const handleCharacterFileChange = async (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && onUploadCharacterImage) {
            await onUploadCharacterImage(index, file);
        }
    };

    const handleSave = async () => {
        if (scenario && onScenarioUpdate) {
            const updatedScenario = {
                ...scenario,
                scenario: editedScenario
            };
            onScenarioUpdate(updatedScenario);
            setEditedScenario(updatedScenario.scenario);
        }
        setIsEditing(false);
    };

    const handleSaveCharacter = async (index: number) => {
        if (scenario && onScenarioUpdate && onRegenerateCharacterImage) {
            const updatedDescription = editedCharacterDescriptions[index];
            
            // Update the scenario with the new description
            const updatedCharacters = [...scenario.characters];
            updatedCharacters[index] = {
                ...updatedCharacters[index],
                description: updatedDescription
            };
            const updatedScenario = {
                ...scenario,
                characters: updatedCharacters
            };
            onScenarioUpdate(updatedScenario);
            
            // Regenerate image with the updated description
            await onRegenerateCharacterImage(index, updatedCharacters[index].name, updatedDescription);
        }
        setEditingCharacterIndex(null);
    };

    const handleSaveSetting = async (index: number) => {
        if (scenario && onScenarioUpdate) {
            const updatedDescription = editedSettingDescriptions[index];
            const setting = scenario.settings[index];
            
            // Add to loading state
            setLocalGeneratingSettings(prev => new Set(prev).add(index));
            setEditingSettingIndex(null);
            
            try {
                // Regenerate scenario text with updated setting
                const { updatedScenario: newScenarioText } = await regenerateScenarioFromSetting(
                    scenario.scenario,
                    setting.name,
                    setting.name, // name stays the same for now
                    updatedDescription
                );
                
                // Update the scenario with the new setting description and scenario text
                const updatedSettings = [...scenario.settings];
                updatedSettings[index] = {
                    ...updatedSettings[index],
                    description: updatedDescription
                };
                const updatedScenario = {
                    ...scenario,
                    settings: updatedSettings,
                    scenario: newScenarioText
                };
                onScenarioUpdate(updatedScenario);
            } catch (error) {
                console.error('Error updating setting:', error);
                // Still update the setting description even if scenario regeneration fails
                const updatedSettings = [...scenario.settings];
                updatedSettings[index] = {
                    ...updatedSettings[index],
                    description: updatedDescription
                };
                const updatedScenario = {
                    ...scenario,
                    settings: updatedSettings
                };
                onScenarioUpdate(updatedScenario);
            } finally {
                // Remove from loading state
                setLocalGeneratingSettings(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(index);
                    return newSet;
                });
            }
        } else {
            setEditingSettingIndex(null);
        }
    };

    const handleSaveMusic = async () => {
        if (scenario && onScenarioUpdate) {
            // Update only the music property without regenerating scenario
            const updatedScenario = {
                ...scenario,
                music: editedMusic
            };
            onScenarioUpdate(updatedScenario);
        }
        setIsEditingMusic(false);
    };

    return (
        <div className="space-y-8">
            {scenario && (
                <>
                    <div className="flex justify-end">
                        <Button
                            onClick={onGenerateStoryBoard}
                            disabled={isLoading}
                            className="bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                            {isLoading ? (
                                <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Generating Storyboard...
                                </>
                            ) : (
                                <>
                                <LayoutGrid className="mr-2 h-4 w-4" />
                                Generate Storyboard with Imagen 4.0
                                </>
                            )}
                        </Button>
                    </div>
                    <div className="max-w-4xl mx-auto space-y-4">
                        <div className="col-span-1">
                            <h3 className="text-xl font-bold">Scenario</h3>
                        </div>
                        <div 
                            ref={scenarioRef}
                            className="relative group"
                            onMouseEnter={() => setIsScenarioHovering(true)}
                            onMouseLeave={() => setIsScenarioHovering(false)}
                        >
                            {!isEditing && isScenarioHovering && (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="absolute top-2 right-2 p-2 rounded-full text-primary-foreground bg-primary/80 hover:bg-primary shadow-sm transition-all"
                                >
                                    <Pencil className="h-4 w-4" />
                                </button>
                            )}
                            {isEditing ? (
                                <Textarea
                                    value={editedScenario}
                                    onChange={handleScenarioChange}
                                    className="min-h-[200px] w-full"
                                    placeholder="Enter your scenario..."
                                    autoFocus
                                />
                            ) : (
                                <p className="whitespace-pre-wrap p-4 rounded-lg border border-transparent group-hover:border-gray-200 transition-colors">{scenario.scenario}</p>
                            )}
                        </div>
                        <div className="col-span-1">
                            <h3 className="text-xl font-bold">Characters</h3>
                        </div>
                        {scenario.characters.map((character, index) => (
                            <div key={character.name} className="flex gap-4 items-start">
                                <div className="flex-shrink-0 w-[200px] h-[200px] relative group">
                                    {generatingCharacterImages?.has(index) && (
                                        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10 rounded-lg">
                                            <Loader2 className="h-8 w-8 text-white animate-spin" />
                                        </div>
                                    )}
                                    <GcsImage
                                        gcsUri={character.imageGcsUri || null}
                                        alt={`Character ${character.name}`}
                                        className="object-cover rounded-lg shadow-md"
                                        sizes="200px"
                                    />
                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                            variant="secondary"
                                            size="icon"
                                            className="bg-black/50 hover:bg-green-500 hover:text-white"
                                            onClick={() => handleCharacterUploadClick(index)}
                                            disabled={generatingCharacterImages?.has(index)}
                                        >
                                            <Upload className="h-4 w-4" />
                                            <span className="sr-only">Upload character image</span>
                                        </Button>
                                    </div>
                                    <input
                                        type="file"
                                        ref={(el) => {
                                            characterFileInputRefs.current[index] = el;
                                            return;
                                        }}
                                        onChange={(e) => handleCharacterFileChange(index, e)}
                                        accept="image/*"
                                        className="hidden"
                                    />
                                </div>
                                <div className="flex-grow relative group">
                                    <h4 className="text-lg font-semibold mb-2">{character.name}</h4>
                                    <div 
                                        ref={(el) => {
                                            characterEditingRefs.current[index] = el;
                                            return;
                                        }}
                                        className="relative"
                                        onMouseEnter={() => handleCharacterHover(index, true)}
                                        onMouseLeave={() => handleCharacterHover(index, false)}
                                    >
                                        {editingCharacterIndex !== index && characterHoverStates[index] && (
                                            <button
                                                onClick={() => setEditingCharacterIndex(index)}
                                                className="absolute top-2 right-2 p-2 rounded-full text-primary-foreground bg-primary/80 hover:bg-primary shadow-sm transition-all"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </button>
                                        )}
                                        {editingCharacterIndex === index ? (
                                            <Textarea
                                                value={editedCharacterDescriptions[index] || ''}
                                                onChange={(e) => handleCharacterDescriptionChange(index, e.target.value)}
                                                className="min-h-[100px] w-full"
                                                placeholder="Enter character description..."
                                                autoFocus
                                            />
                                        ) : (
                                            <p className="whitespace-pre-wrap p-4 rounded-lg border border-transparent group-hover:border-gray-200 transition-colors">
                                                {character.description}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                        <div className="col-span-1">
                            <h3 className="text-xl font-bold">Settings</h3>
                        </div>
                        {scenario.settings.map((setting, index) => (
                            <div key={setting.name} className="flex gap-4 items-start">
                                <div className="flex-shrink-0 w-[200px] h-[200px] relative">
                                    {(localGeneratingSettings.has(index) || generatingSettings?.has(index)) && (
                                        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10 rounded-lg">
                                            <Loader2 className="h-8 w-8 text-white animate-spin" />
                                        </div>
                                    )}
                                    <GcsImage
                                        gcsUri={setting.imageGcsUri || null}
                                        alt={`Setting ${setting.name}`}
                                        className="object-cover rounded-lg shadow-md"
                                        sizes="200px"
                                    />
                                </div>
                                <div className="flex-grow relative group">
                                    <h4 className="text-lg font-semibold mb-2">{setting.name}</h4>
                                    <div 
                                        ref={(el) => {
                                            settingEditingRefs.current[index] = el;
                                            return;
                                        }}
                                        className="relative"
                                        onMouseEnter={() => handleSettingHover(index, true)}
                                        onMouseLeave={() => handleSettingHover(index, false)}
                                    >
                                        {editingSettingIndex !== index && settingHoverStates[index] && !localGeneratingSettings.has(index) && !generatingSettings?.has(index) && (
                                            <button
                                                onClick={() => setEditingSettingIndex(index)}
                                                className="absolute top-2 right-2 p-2 rounded-full text-primary-foreground bg-primary/80 hover:bg-primary shadow-sm transition-all"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </button>
                                        )}
                                        {editingSettingIndex === index ? (
                                            <Textarea
                                                value={editedSettingDescriptions[index] || ''}
                                                onChange={(e) => handleSettingDescriptionChange(index, e.target.value)}
                                                className="min-h-[100px] w-full"
                                                placeholder="Enter setting description..."
                                                autoFocus
                                            />
                                        ) : (
                                            <p className="whitespace-pre-wrap p-4 rounded-lg border border-transparent group-hover:border-gray-200 transition-colors">
                                                {setting.description}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                        <div className="col-span-1">
                            <h3 className="text-xl font-bold">Music</h3>
                        </div>
                        <div 
                            ref={musicRef}
                            className="relative group col-span-2"
                            onMouseEnter={() => setIsMusicHovering(true)}
                            onMouseLeave={() => setIsMusicHovering(false)}
                        >
                            {!isEditingMusic && isMusicHovering && (
                                <button
                                    onClick={() => setIsEditingMusic(true)}
                                    className="absolute top-2 right-2 p-2 rounded-full text-primary-foreground bg-primary/80 hover:bg-primary shadow-sm transition-all"
                                >
                                    <Pencil className="h-4 w-4" />
                                </button>
                            )}
                            {isEditingMusic ? (
                                <Textarea
                                    value={editedMusic}
                                    onChange={handleMusicChange}
                                    className="min-h-[100px] w-full"
                                    placeholder="Enter music description..."
                                    autoFocus
                                />
                            ) : (
                                <p className="whitespace-pre-wrap p-4 rounded-lg border border-transparent group-hover:border-gray-200 transition-colors">
                                    {scenario.music}
                                </p>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}

