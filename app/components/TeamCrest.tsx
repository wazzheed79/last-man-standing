'use client'

import { useState } from 'react'

interface TeamCrestProps {
  src?: string | null
  alt?: string
  className?: string
}

/**
 * Renders a team crest, falling back to a plain placeholder badge instead of
 * a broken-image icon if the URL is missing or fails to load.
 */
export default function TeamCrest({ src, alt = '', className = 'w-6 h-6 object-contain' }: TeamCrestProps) {
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return <div className={`${className} rounded-full bg-slate-200 shrink-0`} aria-hidden="true" />
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  )
}
