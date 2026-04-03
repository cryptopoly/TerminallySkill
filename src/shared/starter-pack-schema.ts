export interface StarterScriptStepTemplate {
  commandString: string
  label?: string
  continueOnError?: boolean
}

export interface StarterScriptTemplate {
  name: string
  description: string
  steps: StarterScriptStepTemplate[]
}

export interface StarterSnippetTemplate {
  name: string
  description: string
  template: string
}

export interface StarterPackPreview {
  detections: string[]
  categories: string[]
  scripts: StarterScriptTemplate[]
  snippets: StarterSnippetTemplate[]
}

export const EMPTY_STARTER_PACK_PREVIEW: StarterPackPreview = {
  detections: [],
  categories: [],
  scripts: [],
  snippets: []
}
