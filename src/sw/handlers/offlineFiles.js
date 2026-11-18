import { wordAudioPaths } from '../wordAudio.js'
import { wordPicturePaths } from '../wordPictures.js'

export async function listOfflineFiles() {
  const [picturePaths, audioPaths] = await Promise.all([wordPicturePaths(), wordAudioPaths()])
  return { files: [...new Set([...picturePaths, ...audioPaths])] }
}
