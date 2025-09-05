'use client'

import { Button } from "@/components/ui/button"
import { LayoutGrid, Loader2, Pencil, Upload, Plus, X } from "lucide-react";
import { Scenario } from "../../types";
import { useState, useRef, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { GcsImage } from "../ui/gcs-image";
import { deleteCharacterFromScenario, deleteSettingFromScenario, deletePropFromScenario } from "@/app/actions/modify-scenario";

interface ScenarioTabProps {
    scenario?: Scenario;
    onGenerateStoryBoard: () => void;
    isLoading: boolean;
    onScenarioUpdate?: (updatedScenario: Scenario) => void;
    onRegenerateCharacterImage?: (characterIndex: number, name: string, description: string) => Promise<void>;
    onUploadCharacterImage?: (characterIndex: number, file: File) => Promise<void>;
    generatingCharacterImages?: Set<number>;
    onRegenerateSettingImage?: (settingIndex: number, name: string, description: string) => Promise<void>;
    onUploadSettingImage?: (settingIndex: number, file: File) => Promise<void>;
    generatingSettingImages?: Set<number>;
    onRegeneratePropImage?: (propIndex: number, name: string, description: string) => Promise<void>;
    onUploadPropImage?: (propIndex: number, file: File) => Promise<void>;
    generatingPropImages?: Set<number>;
}

export function ScenarioTab({ scenario, onGenerateStoryBoard, isLoading, onScenarioUpdate, onRegenerateCharacterImage, onUploadCharacterImage, generatingCharacterImages, onRegenerateSettingImage, onUploadSettingImage, generatingSettingImages, onRegeneratePropImage, onUploadPropImage, generatingPropImages }: ScenarioTabProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editedScenario, setEditedScenario] = useState(scenario?.scenario || '');
    const [isScenarioHovering, setIsScenarioHovering] = useState(false);
    const [editingCharacterIndex, setEditingCharacterIndex] = useState<number | null>(null);
    const [editedCharacterDescriptions, setEditedCharacterDescriptions] = useState<string[]>([]);
    const [editedCharacterNames, setEditedCharacterNames] = useState<string[]>([]);
    const [characterHoverStates, setCharacterHoverStates] = useState<boolean[]>([]);
    const [editingSettingIndex, setEditingSettingIndex] = useState<number | null>(null);
    const [editedSettingDescriptions, setEditedSettingDescriptions] = useState<string[]>([]);
    const [editedSettingNames, setEditedSettingNames] = useState<string[]>([]);
    const [settingHoverStates, setSettingHoverStates] = useState<boolean[]>([]);

    const [editingPropIndex, setEditingPropIndex] = useState<number | null>(null);
    const [editedPropDescriptions, setEditedPropDescriptions] = useState<string[]>([]);
    const [editedPropNames, setEditedPropNames] = useState<string[]>([]);
    const [propHoverStates, setPropHoverStates] = useState<boolean[]>([]);

    const [localGeneratingSettings, setLocalGeneratingSettings] = useState<Set<number>>(new Set());
    const [isEditingMusic, setIsEditingMusic] = useState(false);
    const [editedMusic, setEditedMusic] = useState('');
    const [isMusicHovering, setIsMusicHovering] = useState(false);
    const scenarioRef = useRef<HTMLDivElement>(null);
    const characterEditingRefs = useRef<(HTMLDivElement | null)[]>([]);
    const characterFileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const settingEditingRefs = useRef<(HTMLDivElement | null)[]>([]);
    const settingFileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const propEditingRefs = useRef<(HTMLDivElement | null)[]>([]);
    const propFileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const musicRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scenario?.scenario) {
            setEditedScenario(scenario.scenario);
        }
        if (scenario?.characters) {
            setEditedCharacterDescriptions(scenario.characters.map(char => char.description));
            setEditedCharacterNames(scenario.characters.map(char => char.name));
            // Initialize refs array for character editing areas
            characterEditingRefs.current = new Array(scenario.characters.length).fill(null);
            // Initialize refs array for character file inputs
            characterFileInputRefs.current = new Array(scenario.characters.length).fill(null);
            // Initialize hover states for characters
            setCharacterHoverStates(new Array(scenario.characters.length).fill(false));
        }
        if (scenario?.settings) {
            setEditedSettingDescriptions(scenario.settings.map(setting => setting.description));
            setEditedSettingNames(scenario.settings.map(setting => setting.name));
            // Initialize refs array for setting editing areas
            settingEditingRefs.current = new Array(scenario.settings.length).fill(null);
            // Initialize refs array for setting file inputs
            settingFileInputRefs.current = new Array(scenario.settings.length).fill(null);
            // Initialize hover states for settings
            setSettingHoverStates(new Array(scenario.settings.length).fill(false));
        }
        if (scenario?.props) {
            setEditedPropDescriptions(scenario.props.map(prop => prop.description));
            setEditedPropNames(scenario.props.map(prop => prop.name));
            // Initialize refs array for prop editing areas
            propEditingRefs.current = new Array(scenario.props.length).fill(null);
            // Initialize refs array for prop file inputs
            propFileInputRefs.current = new Array(scenario.props.length).fill(null);
            // Initialize hover states for props
            setPropHoverStates(new Array(scenario.props.length).fill(false));
        }
        if (scenario?.music) {
            setEditedMusic(scenario.music);
        }
    }, [scenario?.scenario, scenario?.characters, scenario?.settings, scenario?.props, scenario?.music]);

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

            // Check if click is outside prop editing area
            if (editingPropIndex !== null) {
                const currentPropRef = propEditingRefs.current[editingPropIndex];
                if (currentPropRef && !currentPropRef.contains(target)) {
                    handleSaveProp(editingPropIndex);
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
    }, [isEditing, editedScenario, editingCharacterIndex, editedCharacterDescriptions, editedCharacterNames, editingSettingIndex, editedSettingDescriptions, editedSettingNames, editingPropIndex, editedPropDescriptions, editedPropNames, isEditingMusic, editedMusic]);

    const handleScenarioChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setEditedScenario(e.target.value);
    };

    const handleCharacterDescriptionChange = (index: number, value: string) => {
        const newDescriptions = [...editedCharacterDescriptions];
        newDescriptions[index] = value;
        setEditedCharacterDescriptions(newDescriptions);
    };

    const handleCharacterNameChange = (index: number, value: string) => {
        const newNames = [...editedCharacterNames];
        newNames[index] = value;
        setEditedCharacterNames(newNames);
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

    const handleSettingNameChange = (index: number, value: string) => {
        const newNames = [...editedSettingNames];
        newNames[index] = value;
        setEditedSettingNames(newNames);
    };

    const handleSettingHover = (index: number, isHovering: boolean) => {
        const newHoverStates = [...settingHoverStates];
        newHoverStates[index] = isHovering;
        setSettingHoverStates(newHoverStates);
    };

    const handlePropDescriptionChange = (index: number, value: string) => {
        const newDescriptions = [...editedPropDescriptions];
        newDescriptions[index] = value;
        setEditedPropDescriptions(newDescriptions);
    };

    const handlePropNameChange = (index: number, value: string) => {
        const newNames = [...editedPropNames];
        newNames[index] = value;
        setEditedPropNames(newNames);
    };

    const handlePropHover = (index: number, isHovering: boolean) => {
        const newHoverStates = [...propHoverStates];
        newHoverStates[index] = isHovering;
        setPropHoverStates(newHoverStates);
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

    const handleSettingUploadClick = (index: number) => {
        settingFileInputRefs.current[index]?.click();
    };

    const handleSettingFileChange = async (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && onUploadSettingImage) {
            await onUploadSettingImage(index, file);
        }
    };

    const handlePropUploadClick = (index: number) => {
        propFileInputRefs.current[index]?.click();
    };

    const handlePropFileChange = async (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && onUploadPropImage) {
            await onUploadPropImage(index, file);
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
        if (scenario && onScenarioUpdate) {
            const updatedDescription = editedCharacterDescriptions[index];
            const updatedName = editedCharacterNames[index];

            // Update the scenario with the new description and name
            const updatedCharacters = [...scenario.characters];
            updatedCharacters[index] = {
                ...updatedCharacters[index],
                name: updatedName,
                description: updatedDescription
            };
            const updatedScenario = {
                ...scenario,
                characters: updatedCharacters
            };
            onScenarioUpdate(updatedScenario);

            // Optionally regenerate image with the updated name and description
            if (onRegenerateCharacterImage) {
                await onRegenerateCharacterImage(index, updatedName, updatedDescription);
            }
        }
        setEditingCharacterIndex(null);
    };

    const handleSaveSetting = async (index: number) => {
        if (scenario && onScenarioUpdate) {
            const updatedDescription = editedSettingDescriptions[index];
            const updatedName = editedSettingNames[index];

            // Update the scenario with the new description and name
            const updatedSettings = [...scenario.settings];
            updatedSettings[index] = {
                ...updatedSettings[index],
                name: updatedName,
                description: updatedDescription
            };
            const updatedScenario = {
                ...scenario,
                settings: updatedSettings
            };
            onScenarioUpdate(updatedScenario);

            // Optionally regenerate image with the updated name and description
            if (onRegenerateSettingImage) {
                await onRegenerateSettingImage(index, updatedName, updatedDescription);
            }
        }
        setEditingSettingIndex(null);
    };

    const handleSaveProp = async (index: number) => {
        if (scenario && onScenarioUpdate) {
            const updatedDescription = editedPropDescriptions[index];
            const updatedName = editedPropNames[index];

            // Update the scenario with the new description and name
            const updatedProps = [...scenario.props];
            updatedProps[index] = {
                ...updatedProps[index],
                name: updatedName,
                description: updatedDescription
            };
            const updatedScenario = {
                ...scenario,
                props: updatedProps
            };
            onScenarioUpdate(updatedScenario);

            // Optionally regenerate image with the updated name and description
            if (onRegeneratePropImage) {
                await onRegeneratePropImage(index, updatedName, updatedDescription);
            }
        }
        setEditingPropIndex(null);
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

    const handleAddCharacter = () => {
        if (scenario && onScenarioUpdate) {
            const newCharacter = {
                name: "New Character",
                description: "Enter character description..."
            };
            const updatedCharacters = [...scenario.characters, newCharacter];
            const updatedScenario = {
                ...scenario,
                characters: updatedCharacters
            };
            onScenarioUpdate(updatedScenario);

            // Set the new character to editing mode
            setEditingCharacterIndex(updatedCharacters.length - 1);
        }
    };

    const handleRemoveCharacter = async (index: number) => {
        if (scenario && onScenarioUpdate) {
            const newScenario = await deleteCharacterFromScenario(scenario.scenario, scenario.characters[index].name, scenario.characters[index].description);
            const updatedCharacters = scenario.characters.filter((_, i) => i !== index);
            const updatedScenario = {
                ...scenario,
                characters: updatedCharacters,
                scenario: newScenario.updatedScenario
            };
            onScenarioUpdate(updatedScenario);

            // Clear editing state if we're removing the character being edited
            if (editingCharacterIndex === index) {
                setEditingCharacterIndex(null);
            } else if (editingCharacterIndex !== null && editingCharacterIndex > index) {
                // Adjust editing index if removing a character before the one being edited
                setEditingCharacterIndex(editingCharacterIndex - 1);
            }
        }
    };

    const handleAddSetting = () => {
        if (scenario && onScenarioUpdate) {
            const newSetting = {
                name: "New Setting",
                description: "Enter setting description..."
            };
            const updatedSettings = [...scenario.settings, newSetting];
            const updatedScenario = {
                ...scenario,
                settings: updatedSettings
            };
            onScenarioUpdate(updatedScenario);

            // Set the new setting to editing mode
            setEditingSettingIndex(updatedSettings.length - 1);
        }
    };

    const handleRemoveSetting = async (index: number) => {
        if (scenario && onScenarioUpdate) {
            const newScenario = await deleteSettingFromScenario(scenario.scenario, scenario.settings[index].name, scenario.settings[index].description);
            const updatedSettings = scenario.settings.filter((_, i) => i !== index);
            const updatedScenario = {
                ...scenario,
                settings: updatedSettings,
                scenario: newScenario.updatedScenario
            };
            onScenarioUpdate(updatedScenario);

            // Clear editing state if we're removing the setting being edited
            if (editingSettingIndex === index) {
                setEditingSettingIndex(null);
            } else if (editingSettingIndex !== null && editingSettingIndex > index) {
                // Adjust editing index if removing a setting before the one being edited
                setEditingSettingIndex(editingSettingIndex - 1);
            }
        }
    };

    const handleAddProp = () => {
        if (scenario && onScenarioUpdate) {
            const newProp = {
                name: "New Prop",
                description: "Enter prop description..."
            };
            const updatedProps = [...scenario.props, newProp];
            const updatedScenario = {
                ...scenario,
                props: updatedProps
            };
            onScenarioUpdate(updatedScenario);

            // Set the new prop to editing mode
            setEditingPropIndex(updatedProps.length - 1);
        }
    };

    const handleRemoveProp = async (index: number) => {
        if (scenario && onScenarioUpdate) {
            const newScenario = await deletePropFromScenario(scenario.scenario, scenario.props[index].name, scenario.props[index].description);
            const updatedProps = scenario.props.filter((_, i) => i !== index);
            const updatedScenario = {
                ...scenario,
                props: updatedProps,
                scenario: newScenario.updatedScenario
            };
            onScenarioUpdate(updatedScenario);

            // Clear editing state if we're removing the prop being edited
            if (editingPropIndex === index) {
                setEditingPropIndex(null);
            } else if (editingPropIndex !== null && editingPropIndex > index) {
                // Adjust editing index if removing a prop before the one being edited
                setEditingPropIndex(editingPropIndex - 1);
            }
        }
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
                                    Generate Storyboard with 🍌
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
                        <div className="col-span-1 flex justify-between items-center">
                            <h3 className="text-xl font-bold">Characters</h3>
                            <Button
                                onClick={handleAddCharacter}
                                variant="outline"
                                size="sm"
                                className="flex items-center gap-2"
                            >
                                <Plus className="h-4 w-4" />
                                Add Character
                            </Button>
                        </div>
                        {scenario.characters.map((character, index) => (
                            <div key={index} className="flex gap-4 items-start">
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
                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
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
                                        <Button
                                            variant="secondary"
                                            size="icon"
                                            className="bg-black/50 hover:bg-red-500 hover:text-white"
                                            onClick={() => handleRemoveCharacter(index)}
                                            disabled={generatingCharacterImages?.has(index)}
                                        >
                                            <X className="h-4 w-4" />
                                            <span className="sr-only">Remove character</span>
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
                                                className="absolute top-0 right-2 p-2 rounded-full text-primary-foreground bg-primary/80 hover:bg-primary shadow-sm transition-all z-10"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </button>
                                        )}
                                        {editingCharacterIndex === index ? (
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="block text-sm font-medium mb-1">Character Name</label>
                                                    <Input
                                                        value={editedCharacterNames[index] || ''}
                                                        onChange={(e) => handleCharacterNameChange(index, e.target.value)}
                                                        placeholder="Enter character name..."
                                                        autoFocus
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium mb-1">Character Description</label>
                                                    <Textarea
                                                        value={editedCharacterDescriptions[index] || ''}
                                                        onChange={(e) => handleCharacterDescriptionChange(index, e.target.value)}
                                                        className="min-h-[100px] w-full"
                                                        placeholder="Enter character description..."
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <div>
                                                <h4 className="text-lg font-semibold mb-2">{character.name}</h4>
                                                <p className="whitespace-pre-wrap p-4 rounded-lg border border-transparent group-hover:border-gray-200 transition-colors">
                                                    {character.description}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                        <div className="col-span-1 flex justify-between items-center">
                            <h3 className="text-xl font-bold">Props</h3>
                            <Button
                                onClick={handleAddProp}
                                variant="outline"
                                size="sm"
                                className="flex items-center gap-2"
                            >
                                <Plus className="h-4 w-4" />
                                Add Prop
                            </Button>
                        </div>
                        {scenario.props?.map((prop, index) => (
                            <div key={index} className="flex gap-4 items-start">
                                <div className="flex-shrink-0 w-[200px] h-[200px] relative group">
                                    {generatingPropImages?.has(index) && (
                                        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10 rounded-lg">
                                            <Loader2 className="h-8 w-8 text-white animate-spin" />
                                        </div>
                                    )}
                                    <GcsImage
                                        gcsUri={prop.imageGcsUri || null}
                                        alt={`Prop ${prop.name}`}
                                        className="object-cover rounded-lg shadow-md"
                                        sizes="200px"
                                    />
                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                        <Button
                                            variant="secondary"
                                            size="icon"
                                            className="bg-black/50 hover:bg-green-500 hover:text-white"
                                            onClick={() => handlePropUploadClick(index)}
                                            disabled={generatingPropImages?.has(index)}
                                        >
                                            <Upload className="h-4 w-4" />
                                            <span className="sr-only">Upload prop image</span>
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            size="icon"
                                            className="bg-black/50 hover:bg-red-500 hover:text-white"
                                            onClick={() => handleRemoveProp(index)}
                                            disabled={generatingPropImages?.has(index)}
                                        >
                                            <X className="h-4 w-4" />
                                            <span className="sr-only">Remove prop</span>
                                        </Button>
                                    </div>
                                    <input
                                        type="file"
                                        ref={(el) => {
                                            propFileInputRefs.current[index] = el;
                                            return;
                                        }}
                                        onChange={(e) => handlePropFileChange(index, e)}
                                        accept="image/*"
                                        className="hidden"
                                    />
                                </div>
                                <div className="flex-grow relative group">
                                    <div
                                        ref={(el) => {
                                            propEditingRefs.current[index] = el;
                                            return;
                                        }}
                                        className="relative"
                                        onMouseEnter={() => handlePropHover(index, true)}
                                        onMouseLeave={() => handlePropHover(index, false)}
                                    >
                                        {editingPropIndex !== index && propHoverStates[index] && (
                                            <button
                                                onClick={() => setEditingPropIndex(index)}
                                                className="absolute top-0 right-2 p-2 rounded-full text-primary-foreground bg-primary/80 hover:bg-primary shadow-sm transition-all z-10"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </button>
                                        )}
                                        {editingPropIndex === index ? (
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="block text-sm font-medium mb-1">Prop Name</label>
                                                    <Input
                                                        value={editedPropNames[index] || ''}
                                                        onChange={(e) => handlePropNameChange(index, e.target.value)}
                                                        placeholder="Enter prop name..."
                                                        autoFocus
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium mb-1">Prop Description</label>
                                                    <Textarea
                                                        value={editedPropDescriptions[index] || ''}
                                                        onChange={(e) => handlePropDescriptionChange(index, e.target.value)}
                                                        className="min-h-[100px] w-full"
                                                        placeholder="Enter prop description..."
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <div>
                                                <h4 className="text-lg font-semibold mb-2">{prop.name}</h4>
                                                <p className="whitespace-pre-wrap p-4 rounded-lg border border-transparent group-hover:border-gray-200 transition-colors">
                                                    {prop.description}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                        <div className="col-span-1 flex justify-between items-center">
                            <h3 className="text-xl font-bold">Settings</h3>
                            <Button
                                onClick={handleAddSetting}
                                variant="outline"
                                size="sm"
                                className="flex items-center gap-2"
                            >
                                <Plus className="h-4 w-4" />
                                Add Setting
                            </Button>
                        </div>
                        {scenario.settings.map((setting, index) => (
                            <div key={index} className="flex gap-4 items-start">
                                <div className="flex-shrink-0 w-[200px] h-[200px] relative group">
                                    {generatingSettingImages?.has(index) && (
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
                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                        <Button
                                            variant="secondary"
                                            size="icon"
                                            className="bg-black/50 hover:bg-green-500 hover:text-white"
                                            onClick={() => handleSettingUploadClick(index)}
                                            disabled={generatingSettingImages?.has(index)}
                                        >
                                            <Upload className="h-4 w-4" />
                                            <span className="sr-only">Upload setting image</span>
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            size="icon"
                                            className="bg-black/50 hover:bg-red-500 hover:text-white"
                                            onClick={() => handleRemoveSetting(index)}
                                            disabled={generatingSettingImages?.has(index)}
                                        >
                                            <X className="h-4 w-4" />
                                            <span className="sr-only">Remove setting</span>
                                        </Button>
                                    </div>
                                    <input
                                        type="file"
                                        ref={(el) => {
                                            settingFileInputRefs.current[index] = el;
                                            return;
                                        }}
                                        onChange={(e) => handleSettingFileChange(index, e)}
                                        accept="image/*"
                                        className="hidden"
                                    />
                                </div>
                                <div className="flex-grow relative group">
                                    <div
                                        ref={(el) => {
                                            settingEditingRefs.current[index] = el;
                                            return;
                                        }}
                                        className="relative"
                                        onMouseEnter={() => handleSettingHover(index, true)}
                                        onMouseLeave={() => handleSettingHover(index, false)}
                                    >
                                        {editingSettingIndex !== index && settingHoverStates[index] && (
                                            <button
                                                onClick={() => setEditingSettingIndex(index)}
                                                className="absolute top-0 right-2 p-2 rounded-full text-primary-foreground bg-primary/80 hover:bg-primary shadow-sm transition-all z-10"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </button>
                                        )}
                                        {editingSettingIndex === index ? (
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="block text-sm font-medium mb-1">Setting Name</label>
                                                    <Input
                                                        value={editedSettingNames[index] || ''}
                                                        onChange={(e) => handleSettingNameChange(index, e.target.value)}
                                                        placeholder="Enter setting name..."
                                                        autoFocus
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium mb-1">Setting Description</label>
                                                    <Textarea
                                                        value={editedSettingDescriptions[index] || ''}
                                                        onChange={(e) => handleSettingDescriptionChange(index, e.target.value)}
                                                        className="min-h-[100px] w-full"
                                                        placeholder="Enter setting description..."
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <div>
                                                <h4 className="text-lg font-semibold mb-2">{setting.name}</h4>
                                                <p className="whitespace-pre-wrap p-4 rounded-lg border border-transparent group-hover:border-gray-200 transition-colors">
                                                    {setting.description}
                                                </p>
                                            </div>
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

