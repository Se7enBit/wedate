/**
 * Saves a backup file. An installed iPhone app gets the share sheet, because downloads are unreliable
 * there; everything else gets a normal download. Returns false if the person cancelled.
 */
export async function saveBackupFile(name: string, json: string): Promise<boolean> {
  const file = new File([json], name, { type: 'application/json' })

  // `navigator.standalone` only exists on iOS.
  const installedOnIos = (navigator as Navigator & { standalone?: boolean }).standalone === true
  if (installedOnIos && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] })
      return true
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return false
      // Sharing failed for another reason: try the download below.
    }
  }

  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return true
}
