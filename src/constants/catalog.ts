export const typeLabels: Record<string, string> = {
  console: 'Konsola',
  desktop: 'Desktop',
  documentation: 'Dokumentacja',
  mobile: 'Mobilna',
  testing: 'Testowanie',
  'unit-testing': 'Testy jednostkowe',
  web: 'Web',
  application: 'Aplikacja',
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
}

export const sortLabels = {
  newest: 'Od najnowszych',
  oldest: 'Od najstarszych',
  type: 'Typ zadania',
  duplicates: 'Najczęściej powtarzane',
} as const

export const sessionLabels: Record<string, string> = {
  '01': 'ZIMA',
  '06': 'LATO',
}
