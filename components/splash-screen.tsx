'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

export function SplashScreen() {
  const [show, setShow] = useState(true)
  const [isFadingOut, setIsFadingOut] = useState(false)
  const [showAlert, setShowAlert] = useState(false)

  useEffect(() => {
    // Ensure this runs only on client
    const hasShown = sessionStorage.getItem('splash_shown')
    
    // Uncomment this if you want it to ONLY show once per session:
    if (hasShown) {
       setShow(false)
       return
    }

    // Start fade out after letters have appeared (e.g. 5 letters * 200ms = 1000ms + 1000ms pause)
    const fadeOutTimer = setTimeout(() => {
      setIsFadingOut(true)
    }, 2200)

    // completely remove from DOM after fade out transition (500ms)
    const removeTimer = setTimeout(() => {
      setShow(false)
      setShowAlert(true) // Show alert right after splash
      sessionStorage.setItem('splash_shown', 'true')
    }, 2700)

    return () => {
      clearTimeout(fadeOutTimer)
      clearTimeout(removeTimer)
    }
  }, [])

  if (!show && !showAlert) return null

  const word = "Dilya"

  return (
    <>
      {show && (
        <div 
          className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background transition-all duration-500 ease-in-out ${
            isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        >
          <div className="flex text-5xl sm:text-7xl font-script text-primary">
            {word.split('').map((letter, index) => (
              <span
                key={index}
                className="opacity-0 animate-splash-letter"
                style={{ 
                  animationDelay: `${index * 150}ms`, 
                  animationFillMode: 'forwards' 
                }}
              >
                {letter}
              </span>
            ))}
          </div>
        </div>
      )}
      
      <Dialog open={showAlert} onOpenChange={setShowAlert}>
        <DialogContent className="sm:max-w-md w-[90%] rounded-xl">
          <DialogHeader>
            <DialogTitle>Bienvenue sur DILYA !</DialogTitle>
            <DialogDescription className="pt-2">
              Si vous rencontrez le moindre problème sur le site ou lors de votre commande, vous pouvez contacter directement le propriétaire sur WhatsApp.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col gap-2 sm:flex-row mt-4">
            <Button variant="outline" onClick={() => setShowAlert(false)}>
              Fermer
            </Button>
            <Button onClick={() => {
              window.open("https://wa.me/221770000000", "_blank")
              setShowAlert(false)
            }} className="bg-green-500 hover:bg-green-600 text-white">
              Contacter sur WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

