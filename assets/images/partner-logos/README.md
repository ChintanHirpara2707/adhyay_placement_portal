Place downloaded company logo image files in this folder.

Guidelines:
- Transparent background preferred.
- Roughly square or wide aspect ratio; rendered at ~60-80px height.
- Name files simply, e.g. google.png, microsoft.png.

Reference each file in constants/showcaseCompanies.ts, e.g.:

  { name: 'Google', logo: require('@/assets/images/partner-logos/google.png') }

(Use the @/ path alias if your tsconfig supports it, otherwise a relative
path from the constants file.)
