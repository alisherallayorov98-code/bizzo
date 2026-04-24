import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { X } from 'lucide-react'

interface BarcodeScannerProps {
  onScan: (barcode: string) => void
  onClose: () => void
}

const SCAN_COOLDOWN = 1000

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const containerId = 'barcode-scanner-container'
  const scannerRef  = useRef<Html5Qrcode | null>(null)
  const lastScanRef = useRef<number>(0)
  const [error, setError]   = useState<string | null>(null)
  const [active, setActive] = useState(false)

  useEffect(() => {
    const scanner = new Html5Qrcode(containerId)
    scannerRef.current = scanner

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 200, height: 120 } },
        (decodedText) => {
          const now = Date.now()
          if (now - lastScanRef.current < SCAN_COOLDOWN) return
          lastScanRef.current = now
          if ('vibrate' in navigator) navigator.vibrate(100)
          onScan(decodedText)
        },
        undefined,
      )
      .then(() => setActive(true))
      .catch((err) => setError(String(err)))

    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => null)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80">
      <div className="relative w-[320px]">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 z-10 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
        >
          <X size={20} />
        </button>

        {/* Scanner viewport */}
        <div className="rounded-xl overflow-hidden relative bg-black">
          <div id={containerId} className="w-full" style={{ minHeight: 240 }} />

          {/* Scan line animation */}
          {active && !error && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div
                className="absolute left-4 right-4 h-0.5 bg-green-400/80 rounded-full shadow-[0_0_8px_2px_rgba(74,222,128,0.5)]"
                style={{ animation: 'scanLine 2s linear infinite', top: '20%' }}
              />
              {/* Corner markers */}
              {['top-0 left-0', 'top-0 right-0', 'bottom-0 left-0', 'bottom-0 right-0'].map((pos, i) => (
                <div
                  key={i}
                  className={`absolute w-6 h-6 border-green-400 ${pos} ${
                    i < 2 ? 'border-t-2' : 'border-b-2'
                  } ${i % 2 === 0 ? 'border-l-2' : 'border-r-2'}`}
                />
              ))}
            </div>
          )}
        </div>

        {error ? (
          <p className="mt-3 text-center text-red-400 text-sm">{error}</p>
        ) : (
          <p className="mt-3 text-center text-white/70 text-sm">
            Barkodni kamera oldiga ushlab turing
          </p>
        )}
      </div>

      <style>{`
        @keyframes scanLine {
          0%   { top: 20%; }
          50%  { top: 75%; }
          100% { top: 20%; }
        }
      `}</style>
    </div>
  )
}
