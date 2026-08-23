export const typeLabels: Record<string, string> = {
  console: 'Konsola',
  desktop: 'Desktop',
  documentation: 'Dokumentacja',
  mobile: 'Mobilna',
  testing: 'Testowanie',
  'unit-testing': 'Testy jednostkowe',
  web: 'Web',
  application: 'Aplikacja',
  database: 'Baza danych',
  'graphics-vector': 'Grafika wektorowa',
  'graphics-raster': 'Grafika rastrowa',
  js: 'JavaScript',
  php: 'PHP',
}

export const typeAccent: Record<string, string> = {
  console: 'ink',
  desktop: 'blue',
  documentation: 'olive',
  mobile: 'teal',
  testing: 'amber',
  'unit-testing': 'red',
  web: 'violet',
  application: 'ink',
  database: 'blue',
  'graphics-vector': 'olive',
  'graphics-raster': 'amber',
  js: 'teal',
  php: 'violet',
}

export const sortLabels = {
  newest: 'Od najnowszych',
  oldest: 'Od najstarszych',
  type: 'Typ zadania',
  part: 'Część egzaminu',
  duplicates: 'Najczęściej powtarzane',
} as const

export const sessionLabels: Record<string, string> = {
  '01': 'ZIMA',
  '06': 'LATO',
}
