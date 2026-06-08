export async function readVideoDurationSeconds(file: File) {
  if (typeof document === 'undefined' || typeof URL === 'undefined') {
    throw new Error('Video metadata is unavailable in this environment.')
  }

  const objectUrl = URL.createObjectURL(file)

  try {
    const durationSeconds = await new Promise<number>((resolve, reject) => {
      const video = document.createElement('video')

      const cleanup = () => {
        video.removeAttribute('src')
        video.load()
      }

      video.preload = 'metadata'
      video.onloadedmetadata = () => {
        const duration = video.duration
        cleanup()

        if (!Number.isFinite(duration) || duration <= 0) {
          reject(new Error('Video duration metadata is unavailable.'))
          return
        }

        resolve(duration)
      }
      video.onerror = () => {
        cleanup()
        reject(new Error('Unable to read video duration metadata.'))
      }
      video.src = objectUrl
    })

    return Number(durationSeconds.toFixed(3))
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}
