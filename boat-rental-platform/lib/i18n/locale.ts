import { cookies } from 'next/headers'
import { type Locale, LOCALES } from './translations'

const VALID = LOCALES.map((l) => l.code)

export async function getLocale(): Promise<Locale> {
  const store = await cookies()
  const val = store.get('locale')?.value as Locale
  return VALID.includes(val) ? val : 'en'
}

export function isRTL(locale: Locale) {
  return locale === 'ar'
}
