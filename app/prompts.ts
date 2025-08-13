import { Scene, Scenario, Language } from "./types"


export function getScenarioPrompt(pitch: string, numScenes: number, style: string, language: Language): string {
  const prompt = `
You are tasked with generating a creative scenario for a short movie and creating prompts for storyboard illustrations. Follow these instructions carefully:
1. First, you will be given a story pitch. This story pitch will be the foundation for your scenario.

<pitch>
${pitch}
</pitch>

2. Generate a scenario in ${language.name} for a movie based on the story pitch. Stick as close as possible to the pitch. Do not include children in your scenario.

3. What Music Genre will best fit this video, pick from: 
- Alternative & Punk
- Ambient
- Children's
- Cinematic
- Classical
- Country & Folk
- Dance & Electronic
- Hip-Hop & Rap
- Holiday
- Jazz & Blues
- Pop
- R&B & Soul
- Reggae
- Rock

4. What is the mood of this video, pick from:
- Angry
- Bright
- Calm
- Dark
- Dramatic
- Funky
- Happy
- Inspirational
- Romantic
- Sad

5. Generate a short description of the music, in English only, that will be used in the video. No references to the story, no references to known artists or songs.

6. Format your output as follows:
- First, provide a detailed description of your scenario in ${language.name}.
- Then from this scenario provide a short description of each character in the story inside the characters key.
- Then from this scenario provide a short description of each setting in the story inside the settings key.

Format the response as a JSON object.
Here's an example of how your output should be structured:
{
 "scenario": "[Brief description of your creative scenario based on the given story pitch]",
 "genre": "[Music genre]",
 "mood": "[Mood]",
 "music": "[Short description of the music that will be used in the video, no references to the story, no references to known artists or songs]",
 "language": {
   "name": "${language.name}",
   "code": "${language.code}"
 },
 "characters": [
  {
    "name": "[character 1 name]", 
    "description": [
      "character 1 description in ${language.name}",
      "Be hyper-specific and affirmative. Include age, gender, ethnicity, specific facial features if any, hair style and color, facial hair or absence of it for male, skin details and exact clothing, including textures and accessories.",
      // "Describe the character's voice clearly to guide the audio generation for any dialogue."
      ]
  },
  {
    "name": "[character 2 name]", 
    "description": [
      "character 2 description in ${language.name}",
      "Be hyper-specific and affirmative. Include age, gender, ethnicity, specific facial features if any, hair style and color, facial hair or absence of it for male, skin details and exact clothing, including textures and accessories.",
      // "Describe the character's voice clearly to guide the audio generation for any dialogue."
      ]
  },
  [...]
 ],
 "settings": [
  {
    "name": "[setting 1 name]", 
    "description": [
      "setting 1 description in ${language.name}",
      "This description establishes the atmosphere, lighting, and key features that must remain consistent.",
      "Be Evocative: Describe the mood, the materials, the lighting, and even the smell or feeling of the air."
    ]
  },
  {
    "name": "[setting 2 name]", 
    "description": [
      "setting 2 description in ${language.name}",
      "This description establishes the atmosphere, lighting, and key features that must remain consistent.",
      "Be Evocative: Describe the mood, the materials, the lighting, and even the smell or feeling of the air."
    ]
  },
  [...]
 ]
}

Remember, your goal is to create a compelling and visually interesting story that can be effectively illustrated through a storyboard. Be creative, consistent, and detailed in your scenario and prompts.
`;
  return prompt
}

export function getScenarioPromptOld(pitch: string, numScenes: number, style: string, language: Language): string {
  const prompt = `
      You are tasked with generating a creative scenario for a short movie and creating prompts for storyboard illustrations. Follow these instructions carefully:
1. First, you will be given a story pitch. This story pitch will be the foundation for your scenario.

<pitch>
${pitch}
</pitch>

2. Generate a scenario in ${language.name} for an movie based on the story pitch. Stick as close as possible to the pitch. Do not include children in your scenario.

3. What Music Genre will best fit this video, pick from: 
- Alternative & Punk
- Ambient
- Children's
- Cinematic
- Classical
- Country & Folk
- Dance & Electronic
- Hip-Hop & Rap
- Holiday
- Jazz & Blues
- Pop
- R&B & Soul
- Reggae
- Rock

4. What is the mood of this video, pick from:
- Angry
- Bright
- Calm
- Dark
- Dramatic
- Funky
- Happy
- Inspirational
- Romantic
- Sad

5. Generate a short description of the music, in English only, that will be used in the video. No references to the story, no references to known artists or songs.

6. After creating the scenario, generate ${numScenes} creative scenes to create a storyboard illustrating the scenario. Follow these guidelines for the scenes:
 a. For each scene, provide:
 1. A detailed visual description for AI image generation (imagePrompt), the style should be ${style}. Always use the FULL character(s) description(s) in your images prompts. Do NOT use the character(s) name(s) in your image prompts.  Always use indefinite articles when describing character(s). No children.
 2. A video prompt, focusing on the movement of the characters, objects, in the scene. Always use the FULL character(s) description(s) in your images prompts. Do NOT use the character(s) name(s) in your image prompts.  Always use indefinite articles when describing character(s). No children.
 3. A scene description  in ${language.name} explaining what happens (description). You can use the character(s) name(s) in your descriptions.
 4. A short, narrator voiceover text in ${language.name}. One full sentence, 6s max. (voiceover). You can use the character(s) name(s) in your vocieovers. 
a. Each image prompt should describe a key scene or moment from your scenario.
b. Ensure that the image prompts, when viewed in sequence, tell a coherent story.
c. Include descriptions of characters, settings, and actions that are consistent across all image prompts.
d. Make each image prompt vivid and detailed enough to guide the creation of a storyboard illustration.

7. Format your output as follows:
- First, provide a detailed description of your scenario in ${language.name}.
- Then from this scenario provide a short description of each character in the story inside the characters key.
- Then from this scenario provide a short description of each setting in the story inside the settings key.
- Then, list the ${numScenes} scenes
- Each image prompt in the scenes should reuse the full characters and settings description generated on the <characters> and <settings> tags every time, on every prompt
- Do not include any additional text or explanations between the prompts.

Format the response as a JSON object.
Here's an example of how your output should be structured:
{
 "scenario": "[Brief description of your creative scenario based on the given story pitch]",
 "genre": [Music genre],
 "mood": [Mood],
 "music": [Short description of the music that will be used in the video, no references to the story, no references to known artists or songs],
 "language": {
   "name": "${language.name}",
   "code": "${language.code}"
 },
 "characters": [
  {"name": [character 1 name], "description": [character 1 description in ${language.name}]},
  {"name": [character 2 name], "description": [character 2 description in ${language.name}]},
  [...]
 ],
 "settings": [
  {"name": [setting 1 name], "description": [setting 1 description in ${language.name}]},
  {"name": [setting 2 name], "description": [setting 2 description in ${language.name}]},
  [...]
 ],
 "scenes": [
 {
  "imagePrompt": [A detailed visual description for AI image generation, the style should always be cinematic and photorealistic],
  "videoPrompt": [A video prompt, focusing on the movement of the characters, objects, in the scene],
  "description": [A scene description explaining what happens],
  "voiceover": [A short, narrator voiceover text. One full sentence, 6s max.],
  "charactersPresent": [An array list of names of characters visually present in the scene]
 },
 [...]
 }
 ]
}

Remember, your goal is to create a compelling and visually interesting story that can be effectively illustrated through a storyboard. Be creative, consistent, and detailed in your scenario and prompts.`

  return prompt;
}

export function getScenesPrompt2(scenario: Scenario, numScenes: number, style: string, language: Language): string {
  const prompt = `
      You are tasked with generating a creative scenes for a short movie and creating prompts for storyboard illustrations. Follow these instructions carefully:
1. First, you will be given a scenario in ${scenario.language.name}. This scenario will be the foundation for your storyboard.

<scenario>
${scenario.scenario}
</scenario>

<characters>
${scenario.characters.map(character => `${character.name}: ${character.description}`).join('\n')}
</characters>

<settings>
${scenario.settings.map(setting => `${setting.name}: ${setting.description}`).join('\n')}
</settings>

<music>
${scenario.music}
</music>

<mood>
${scenario.mood}
</mood>

2. Generate exactly ${numScenes}, creative scenes to create a storyboard illustrating the scenario. Follow these guidelines for the scenes:
 a. For each scene, provide:
 1. A detailed visual description for AI image generation (imagePrompt) in ${language.name} for the first frame of the video, the style should be ${style}. Always use the FULL character(s) description(s) in your images prompts. No children.In formatted YAML string.
schema:
  type: object
  properties:
    Style:
      type: string
      description: Define the visual language of your project.
    Composition:
      type: object
      description: Describe the composition of the shot. Be consistent.
      properties:
        shot_type:
          type: string
          description: Examples include Cinematic close-up, Wide establishing shot, etc.
        lighting:
          type: string
          description: Examples include high-contrast, soft natural light, etc.
        overall_mood:
          type: string
          description: Examples include gritty realism, atmospheric.
      required:
        - shot_type
        - lighting
        - lens_effects
        - overall_mood
    Subject:
      type: string
      description: Clearly state the main focus of the shot. If a character is the subject, paste their entire description here. If multiple characters are present, paste both full descriptions.
    Context:
      type: string
      description: This is the most critical field for visual consistency. Fully describe the environment. Paste the entire setting description for the primary location. The “Interior + Exterior” Rule: If the shot is an interior with a window or viewport, you must describe both the interior and the visible exterior.
  required:
    - Style
    - Composition
    - Subject
    - Context
 2. A video prompt in ${language.name}, focusing on the movement of the characters, objects, in the scene, the style should be ${style}. No children.
schema:
  type: object
  properties:
    Action:
      type: string
      description: Describe precisely what the subject(s) is(are) doing within the 8-second clip. Be specific and evocative. Separate description from action. The Subject field describes who they are; the Action field describes what they do.
    Camera_Motion:
      type: string
      description: Explicitly state the camera movement, even if it's static. This removes ambiguity.
    Ambiance_Audio:
      type: string
      description: Diegetic Sound Only. This is crucial. Describe only the sounds that exist within the world of the scene. Do not mention music or narration, as those are post-production layers for different models. Be specific.
    Dialogue:
      type: array
      description: Keep it short and natural to fit within the 8-second clip. The dialogue of all the scenes should make the story comprehensible for the viewer.
      items:
        type: object
        properties:
          speaker:
            type: string
            description: Assign lines using physical descriptions, not names, for maximum clarity (e.g., "The man in the blue shirt", "The woman with red hair").
          line:
            type: string
            description: The actual dialogue spoken.
        required:
          - speaker
          - line
  required:
    - Action
    - Camera_Motion
    - Ambiance_Audio
    - Dialogue   
 3. A scene description  in ${language.name} explaining what happens (description). You can use the character(s) name(s) in your descriptions.
 4. A short, narrator voiceover text in ${language.name}. One full sentence, 6s max. (voiceover). You can use the character(s) name(s) in your vocieovers. 
a. Each image prompt should describe a key scene or moment from your scenario.
b. Ensure that the image prompts, when viewed in sequence, tell a coherent story.
c. Include descriptions of characters, settings, and actions that are consistent across all image prompts.
d. Make each image prompt vivid and detailed enough to guide the creation of a storyboard illustration.

7. Format your output as follows:
- List the ${numScenes} scenes
- Each image prompt in the scenes should reuse the full characters and settings description generated on the <characters> and <settings> tags every time, on every prompt
- Do not include any additional text or explanations between the prompts.

Format the response as a JSON object.
Here's an example of how your output should be structured:
{
 "scenes": [
 {
  "imagePrompt": [A detailed visual description for AI image generation, including Style/Composition, Subject and Context as one big formatted yaml string],
  "videoPrompt": [A video prompt, including Action, Camera Motion, Ambiance/Audio and Dialogue as one big formatted yaml string],
  "description": [A scene description explaining what happens],
  "voiceover": [A short, narrator voiceover text. One full sentence, 6s max.],
  "charactersPresent": [An array list of names of characters visually present in the scene]
 },
 [...]
 }
 ]
}

Remember, your goal is to create a compelling and visually interesting story that can be effectively illustrated through a storyboard. Be creative, consistent, and detailed in your prompts.
Remember, the number of scenes should be exactly ${numScenes}.`
  return prompt;
}

export function getScenesPrompt(scenario: Scenario, numScenes: number, style: string, language: Language): string {
  const prompt = `
      You are tasked with generating a creative scenes for a short movie and creating prompts for storyboard illustrations. Follow these instructions carefully:
1. First, you will be given a scenario in ${scenario.language.name}. This scenario will be the foundation for your storyboard.

<scenario>
${scenario.scenario}
</scenario>

<characters>
${scenario.characters.map(character => `${character.name}: ${character.description}`).join('\n')}
</characters>

<settings>
${scenario.settings.map(setting => `${setting.name}: ${setting.description}`).join('\n')}
</settings>

<music>
${scenario.music}
</music>

<mood>
${scenario.mood}
</mood>

2. Generate ${numScenes} creative scenes to create a storyboard illustrating the scenario. Follow these guidelines for the scenes:
 a. For each scene, provide:
 1. A detailed visual description for AI image generation (imagePrompt) in ${language.name}, the style should be ${style}. Always use the FULL character(s) description(s) in your images prompts. Do NOT use the character(s) name(s) in your image prompts.  Always use indefinite articles when describing character(s). No children.
 2. A video prompt in ${language.name}, focusing on the movement of the characters, objects, in the scene, the style should be ${style}. Always use the FULL character(s) description(s) in your images prompts. Do NOT use the character(s) name(s) in your video prompts.  Always use indefinite articles when describing character(s). No children.
 3. A scene description  in ${language.name} explaining what happens (description). You can use the character(s) name(s) in your descriptions.
 4. A short, narrator voiceover text in ${language.name}. One full sentence, 6s max. (voiceover). You can use the character(s) name(s) in your vocieovers. 
a. Each image prompt should describe a key scene or moment from your scenario.
b. Ensure that the image prompts, when viewed in sequence, tell a coherent story.
c. Include descriptions of characters, settings, and actions that are consistent across all image prompts.
d. Make each image prompt vivid and detailed enough to guide the creation of a storyboard illustration.

7. Format your output as follows:
- List the ${numScenes} scenes
- Each image prompt in the scenes should reuse the full characters and settings description generated on the <characters> and <settings> tags every time, on every prompt
- Do not include any additional text or explanations between the prompts.

Format the response as a JSON object.
Here's an example of how your output should be structured:
{
 "scenes": [
 {
  "imagePrompt": [A detailed visual description for AI image generation, include the style ${style} in the prompt],
  "videoPrompt": [A video prompt, focusing on the movement of the characters, objects, in the scene, include the style ${style} in the prompt],
  "description": [A scene description explaining what happens],
  "voiceover": [A short, narrator voiceover text. One full sentence, 6s max.],
  "charactersPresent": [An array list of names of characters visually present in the scene]
 },
 [...]
 }
 ]
}

Remember, your goal is to create a compelling and visually interesting story that can be effectively illustrated through a storyboard. Be creative, consistent, and detailed in your prompts.
The number of scenes should be exactly  ${numScenes}.`
  return prompt;
}
