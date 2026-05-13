function getDownloadUrl(mediaUrl: string) {
  return `${mediaUrl}${mediaUrl.includes('?') ? '&' : '?'}download=1`
}

function getFilenameFromDisposition(contentDisposition: string | null) {
  if (!contentDisposition) {
    return null
  }

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1])
  }

  const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/i)
  return filenameMatch?.[1] ?? null
}

function getFallbackFilename(mediaUrl: string, mimeType: string | null) {
  const pathname = mediaUrl.split('?')[0] ?? ''
  const lastSegment = pathname.split('/').pop()?.trim()

  if (lastSegment) {
    return lastSegment
  }

  if (mimeType === 'image/png') {
    return 'forwarded-result.png'
  }

  if (mimeType === 'image/jpeg') {
    return 'forwarded-result.jpg'
  }

  return 'forwarded-result'
}

export async function fetchForwardedResultFile(mediaUrl: string) {
  const response = await fetch(getDownloadUrl(mediaUrl), {
    cache: 'no-store',
    credentials: 'same-origin',
  })

  if (!response.ok) {
    throw new Error('Unable to load the selected result for video forwarding.')
  }

  const mimeType = response.headers.get('Content-Type')
  const fileName =
    getFilenameFromDisposition(response.headers.get('Content-Disposition')) ??
    getFallbackFilename(mediaUrl, mimeType)
  const buffer = await response.arrayBuffer()

  return new File([buffer], fileName, {
    type: mimeType ?? 'application/octet-stream',
  })
}
