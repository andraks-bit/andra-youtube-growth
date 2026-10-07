'use client'

import { useEffect, useRef, useState } from 'react'
import { Volume2, VolumeX } from 'lucide-react'

const accent = '#74cfe8'
const STORAGE_KEY = 'ambientSoundOn'

export default function AmbientSoundToggle() {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [on, setOn] = useState(false)

  // Picks up a returning visitor's previous choice; playback only ever
  // starts from a click (browsers block audible autoplay either way).
  useEffect(() => {
    setOn(localStorage.getItem(STORAGE_KEY) === 'true')
  }, [])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    if (on) {
      audio.play().catch(() => setOn(false))
    } else {
      audio.pause()
    }
    localStorage.setItem(STORAGE_KEY, String(on))
  }, [on])

  return (
    <>
      <audio ref={audioRef} src="/audio/ocean-waves.mp3" loop preload="none" />
      <button
        type="button"
        className="ambient-sound-toggle"
        onClick={() => setOn((v) => !v)}
        aria-label={on ? 'Mute background ocean sound' : 'Play background ocean sound'}
        aria-pressed={on}
        style={{
          position: 'fixed',
          bottom: '20px',
          left: '20px',
          zIndex: 40,
          width: '44px',
          height: '44px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          background: 'rgba(7,16,30,0.85)',
          border: `1px solid ${on ? accent : 'rgba(255,255,255,0.18)'}`,
          color: on ? accent : 'rgba(244,244,242,0.65)',
          backdropFilter: 'blur(6px)',
          cursor: 'pointer',
        }}
      >
        {on ? <Volume2 size={18} /> : <VolumeX size={18} />}
      </button>
      {/* Boat pages show a fixed mobile booking bar (~76px) along the same edge — clear it. */}
      <style>{`@media (max-width: 900px) { .ambient-sound-toggle { bottom: 96px !important; } }`}</style>
    </>
  )
}
