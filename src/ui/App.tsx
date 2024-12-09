import { useEffect, useState } from 'react'
import './App.css'
import { NavLink } from 'react-router'

import filesvg from './assets/file.svg'
import windowsvg from './assets/window.svg'
import globesvg from './assets/globe.svg'

function App() {
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [isHybridStarted, setIsHybridStarted] = useState<boolean>(false);

  useEffect(() => {
    if (!isHybridStarted) {
      window.electron?.startHybrid()
      .then((url: string) => {
        console.log('QR Code URL', url);
        setQrCodeUrl(url);
        setIsHybridStarted(true);
      }).catch((error: any) => {
        console.error("The error is:", error);
      });
    }
  })

  return (
    <>
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
        <h1 className="text-4xl">Login to Messaging app by scanning QR Code</h1>
        <ol className="list-inside list-decimal text-sm text-center sm:text-left font-[family-name:var(--font-geist-mono)]">
          <li className="mb-2">Open messaging app.</li>
          <li>Go to <b>Setting {'>'} Devices {'>'} Link Device</b></li>
          <li>Point your phone, and confirm login</li>
        </ol>

        <div className="flex gap-4 items-center flex-col sm:flex-row">
        {qrCodeUrl && <img className="min-h-fit" src={qrCodeUrl} alt="QR Code" />}
        </div>
      </main>
      <footer className="row-start-3 flex gap-6 flex-wrap items-center justify-center">
      <span>A DaryaScam Project. Developed by Yuriy Ackermann</span>

        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://github.com/DaryaScam/Web-Demo"
          target="_blank"
          rel="noopener noreferrer"
        >
          <img src={filesvg} alt="File icon" width={16} height={16} />
          Code
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://github.com/DaryaScam"
          target="_blank"
          rel="noopener noreferrer"
        >
          <img src={windowsvg} alt="Window icon" width={16} height={16} />
          Examples
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://DaryaScam.info"
          target="_blank"
          rel="noopener noreferrer"
        >
          <img src={globesvg} alt="Globe icon" width={16} height={16} />
          Go to DaryaScam.info →
        </a>
      </footer>
    </div>
    </>
  )
}

export default App
