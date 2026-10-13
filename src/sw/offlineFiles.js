import { keepFilesForOffline } from './keptFiles.js'
import { wordAudioToKeep } from './wordAudio.js'
import { wordPicturesToKeep } from './wordPictures.js'

export async function saveFilesForOffline(scopeUrl, onProgress) {
  const fileSets = await Promise.all([wordPicturesToKeep(), wordAudioToKeep()])
  await keepFilesForOffline(fileSets, scopeUrl, onProgress)
}
