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
- Then, optionally, and only for very important props (products for ads, recurring objects, vehicles), if any, 0 to 2 props max, a short description of each prop important for the story

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
    "voice" "[character's voice description. One sentence.]
    "description": [
      "character 1 description in ${language.name}",
      "Be hyper-specific and affirmative and short, one sentence max. Include age, gender, ethnicity, specific facial features if any, hair style and color, facial hair or absence of it for male, skin details and exact clothing, including textures and accessories.",
      // "Describe the character's voice clearly to guide the audio generation for any dialogue."
      ]
  },
  {
    "name": "[character 2 name]", 
    "voice" "[character's voice description. One sentence.]
    "description": [
      "character 2 description in ${language.name}",
      "Be hyper-specific and affirmative and short, one sentence max. Include age, gender, ethnicity, specific facial features if any, hair style and color, facial hair or absence of it for male, skin details and exact clothing, including textures and accessories.",
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
      "Be Evocative and short, one sentence max: Describe the mood, the materials, the lighting, and even the smell or feeling of the air."
    ]
  },
  {
    "name": "[setting 2 name]", 
    "description": [
      "setting 2 description in ${language.name}",
      "This description establishes the atmosphere, lighting, and key features that must remain consistent.",
      "Be Evocative and short, one sentence max: Describe the mood, the materials, the lighting, and even the smell or feeling of the air."
    ]
  }, 
  "props": [
  {
    "name": "[prop 1 name]", 
    "description": [
      "prop 1 description in ${language.name}",
      "This description establishes the atmosphere, lighting, and key features that must remain consistent.",
      "Be Evocative and short, one sentence max: Describe the mood, the materials, the lighting, and even the smell or feeling of the air."
    ]
  }
  [...]
 ]
}

Remember, your goal is to create a compelling and visually interesting story that can be effectively illustrated through a storyboard. Be creative, consistent, and detailed in your scenario and prompts.
`;
  return prompt
}

export function getScenesPrompt(scenario: Scenario, numScenes: number, style: string, language: Language): string {
  const durationSeconds = scenario.durationSeconds || 8;
  const prompt = `
      You are tasked with generating a creative scenes for a short movie and creating prompts for storyboard illustrations. Follow these instructions carefully:
1. First, you will be given a scenario in ${scenario.language.name}. This scenario will be the foundation for your storyboard.

<scenario>
${scenario.scenario}
</scenario>

<characters>
${scenario.characters.map(character => `Name: ${character.name}
  Description: ${character.description}
  Voice Description: ${character.voice}`).join('\n\n\n')}
</characters>

<props>
${scenario.props?.map(prop => `${prop.name}\n\n${prop.description}`).join('\n\n\n')}
</props>

<settings>
${scenario.settings.map(setting => `${setting.name}\n\n${setting.description}`).join('\n\n\n')}
</settings>

<music>
${scenario.music}
</music>

<mood>
${scenario.mood}
</mood>

2. Generate exactly ${numScenes}, creative scenes to create a storyboard illustrating the scenario. Follow these guidelines for the scenes:
 a. For each scene, provide:
 1. A video prompt in ${language.name}, focusing on the movement of the characters, objects, in the scene, the style should be ${style}. No children. Return as a JSON object with the following schema:
{
  "Action": "Describe precisely what the subject(s) is(are) doing within the ${durationSeconds} seconds clip. Be specific and evocative. Separate description from action. The Subject field describes who they are; the Action field describes what they do.",
  "Camera_Motion": "Explicitly state the camera movement, even if it's static. This removes ambiguity.",
  "Ambiance_Audio": "Diegetic Sound Only. This is crucial. Describe only the sounds that exist within the world of the scene. Do not mention music or narration, as those are post-production layers for different models. Be specific.",
  "Dialogue": [
    {
      "name": "speaker name, only the name, choices are [${scenario.characters?.map(character => `${character.name}`).join(',')}]",
      "speaker": "Assign lines using physical descriptions, not names, for maximum clarity (e.g., 'The man in the blue shirt', 'The woman with red hair')",
      "line": "The actual dialogue spoken"
    }
  ]
}
 2. A detailed visual description for AI image generation (imagePrompt) in ${language.name} for the first frame of the video, the style should be ${style}. 
 Keep in mind that the image prompt is for the first frame of the video, so it should be a single frame happening before the action in the video.
 No split screen. No frame on frame.
 No children. Return as a JSON object with the following schema:
{
  "Style": "Define the visual language of your project",
  "Scene": "Describe the specific scene being depicted - what is happening in this moment, the action or situation being shown, and how it fits into the overall narrative flow.",
  "Composition": {
    "shot_type": "Examples include Cinematic close-up, Wide establishing shot, etc.",
    "lighting": "Examples include high-contrast, soft natural light, etc.",
    "overall_mood": "Examples include gritty realism, atmospheric"
  },
  "Subject": [
    {
      "name": "character name, only the name, choices are [${scenario.characters?.map(character => `${character.name}`).join(',')}]",
    }
  ],
  "Prop": [
    {
      "name": "prop name, only the name, choices are [${scenario.props?.map(prop => `${prop.name}`).join(',')}]",
    }
  ],
  "Context": [
    {
      "name": "setting name, only the name, choices are [${scenario.settings?.map(setting => `${setting.name}`).join(',')}]",
    }
  ],
}   
 3. A scene description  in ${language.name} explaining what happens (description). You can use the character(s) name(s) in your descriptions.
 4. A short, narrator voiceover text in ${language.name}. One full sentence, ${durationSeconds - 2}s max. (voiceover). You can use the character(s) name(s) in your vocieovers. 
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
  "imagePrompt": {
    "Style": "visual style description",
    "Composition": {
      "shot_type": "type of shot",
      "lighting": "lighting description",
      "overall_mood": "mood description"
    },
    "Subject": [
      {
        "name": "subject name",
      }
    ],
    "Prop": [
      {
        "name": "prop name",
      }
    ],
    "Context": [
      {
        "name": "context name",
      }
    ],
    "Scene": "scene description"
  },
  "videoPrompt": {
    "Action": "action description",
    "Camera_Motion": "camera movement",
    "Ambiance_Audio": "ambient sounds",
    "Dialogue": [
      {
        "name": "speaker name",
        "speaker": "speaker description",
        "line": "dialogue line"
      }
    ]
  },
  "description": [A scene description explaining what happens],
  "voiceover": [A short, narrator voiceover text. One full sentence, ${durationSeconds - 2}s max.],
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
