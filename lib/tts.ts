import { Storage } from '@google-cloud/storage';
import textToSpeech, { protos } from '@google-cloud/text-to-speech';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import logger from '@/app/logger';

// 从环境变量获取统一的 GCS 存储桶名称
const GCS_BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'storycraft-videos';

// 音频文件存储路径
const AUDIO_PATH = 'audio/';

const storage = new Storage();

// Assuming you're using Google Cloud Text-to-Speech:
const client = new textToSpeech.TextToSpeechClient();

export async function tts(text: string, language: string, voiceName?: string): Promise<string> {
  const listVoicesRequest: protos.google.cloud.texttospeech.v1.IListVoicesRequest = {
    languageCode: language,
  };
  const [response] = await client.listVoices(listVoicesRequest);

  logger.debug(response)
  
  let selectedVoiceName: string | null | undefined;
  if (voiceName) {
    selectedVoiceName = voiceName;
  } else {
    selectedVoiceName = 'Algenib'
  }
  // If no voice is specified, use the default selection logic
  if (selectedVoiceName && response.voices) {
    // choose the voice with the name that contains the selected voice
    const voice = response.voices.find((voice) => voice.name?.includes('Chirp3-HD-'+selectedVoiceName!));
    if (voice) {
      selectedVoiceName = voice.name;
    } else {
      const charonVoice = response.voices.find((voice) => voice.name?.includes('Chirp3-HD-Charon'));
      if (charonVoice) {
        selectedVoiceName = charonVoice.name;
      } else {
        logger.error('No voices found for language:', language);
        throw new Error('No voices found for language');
      }
    }
  }

  logger.debug(`Using voice: ${selectedVoiceName}`);
  const request = {
    input: { 
      text: text,
      //prompt: "Voiceover for a short movie:",
    },
    voice: {
      languageCode: language,
      name: selectedVoiceName,
      //modelName: "gemini-2.5-pro-preview-tts",
    },
    audioConfig: {
      audioEncoding: protos.google.cloud.texttospeech.v1.AudioEncoding.MP3
    },
  };

  try {
    const response = await client.synthesizeSpeech(request);
    const audioContent = response[0].audioContent;

    if (!audioContent) {
      logger.error("No audio content received from TTS API");
      throw new Error('No audio content received from TTS API');
    }

    // Define the directory where you want to save the audio files
    const publicDir = path.join(process.cwd(), 'public');
    const outputDir = path.join(publicDir, 'tts'); // Example: public/audio

    // Ensure the directory exists
    fs.mkdirSync(outputDir, { recursive: true });

    // Generate a unique filename, e.g., using a timestamp or a UUID
    const uuid = uuidv4();
    const fileName = `audio-${uuid}.mp3`;

    // Return the relative file path (for serving the file)
    let voiceoverUrl: string;
    // Upload audio to GCS
    logger.debug(`Upload audio result to GCS`);
    const bucketName = GCS_BUCKET_NAME;
    const destinationPath = path.join(AUDIO_PATH, fileName);
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(destinationPath);


    await file.save(audioContent, {
      metadata: {
        contentType: `audio/mpeg`, // Set the correct content type
      }
    });
    return file.cloudStorageURI.href;
  } catch (error) {
    logger.error('Error in tts function:', error);
    throw error;
  }
}