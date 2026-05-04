declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext
  }

  interface Document {
    startViewTransition: (updateCallback: () => void) => ViewTransition
  }

  interface ViewTransition {
    finished: Promise<void>
    ready: Promise<void>
    updateCallbackDone: Promise<void>
  }
}

export {}
