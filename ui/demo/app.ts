import { configureZenTrace, enableAutoTracing } from '../../src/index'

import { demoExamples } from './examples'

configureZenTrace({ testMode: true })
enableAutoTracing({ logs: true, http: true })

const status = document.getElementById('status')
const exampleList = document.getElementById('examples')

let activeButton: HTMLButtonElement | null = null

async function runExample(
  exampleId: string,
  button: HTMLButtonElement,
): Promise<void> {
  const example = demoExamples.find((item) => item.id === exampleId)
  if (!example || !status) return

  activeButton?.removeAttribute('disabled')
  activeButton = button
  button.setAttribute('disabled', 'true')
  status.textContent = `Running ${example.label}…`

  try {
    const result = await example.run()
    status.textContent = `Done (${example.label}):\n${JSON.stringify(result, null, 2)}`
  } catch (error) {
    status.textContent = `Failed (${example.label}): ${String(error)}`
  } finally {
    button.removeAttribute('disabled')
    activeButton = null
  }
}

if (exampleList) {
  for (const example of demoExamples) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'example-btn'
    button.dataset.exampleId = example.id
    button.textContent = example.label
    button.title = example.description

    button.addEventListener('click', () => {
      void runExample(example.id, button)
    })

    const hint = document.createElement('p')
    hint.className = 'example-hint'
    hint.textContent = example.description

    const card = document.createElement('article')
    card.className = 'example-card'
    card.append(button, hint)

    exampleList.append(card)
  }
}

if (status) {
  status.style.whiteSpace = 'pre-wrap'
  status.textContent =
    'Open Chrome DevTools → ZenTrace panel → pick an example below.'
}
