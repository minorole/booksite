// Language preference types for bilingual features

export type LanguagePreference = 'zh' | 'en' | 'auto'
export type StrictLanguagePreference = Exclude<LanguagePreference, 'auto'>

