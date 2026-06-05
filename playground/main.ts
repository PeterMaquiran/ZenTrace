import { models } from '../src'

declare global {
  interface Window {
    models: typeof models
  }
}

window['models'] = models
