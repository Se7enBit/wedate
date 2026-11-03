// Every UI string lives here, so translating later is one file.
export const strings = {
  appName: 'WeDate',
  comingSoon: 'Coming soon',
  tabs: {
    discover: 'Discover',
    now: 'Now',
    create: 'Create',
    saved: 'Saved',
  },
  settings: {
    title: 'Settings',
    open: 'Open settings',
  },
  screens: {
    discover: { title: 'Discover', hint: 'Browse date ideas and filter by budget, time and vibe.' },
    now: { title: 'Right now', hint: 'Get a date that fits this moment, the weather and your mood.' },
    create: { title: 'Create', hint: 'Let AI dream up ideas just for the two of you.' },
    saved: { title: 'Saved', hint: 'Your saved ideas, the dates you have done and your own ideas.' },
    settings: { title: 'Settings', hint: 'Your Gemini key, city and backups will live here.' },
  },
} as const
