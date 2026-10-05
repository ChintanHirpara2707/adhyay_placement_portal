// Showcase (hand-picked) partner logos.
//
// HOW TO ADD A LOGO:
// 1. Drop the image file into assets/images/partner-logos/
//    (transparent background preferred, ~60-80px render height).
// 2. Add one line to the array below:
//      { name: 'Google', logo: require('@/assets/images/partner-logos/google.png') },
//    Use the @/ alias (or a relative path from THIS file:
//      require('../assets/images/partner-logos/google.png')).
// 3. Keep names short — they are used as accessibility labels.
//
// Example — uncomment and edit after adding files:
// export const SHOWCASE_COMPANIES = [
//   { name: 'Google', logo: require('@/assets/images/partner-logos/google.png') },
//   { name: 'Microsoft', logo: require('@/assets/images/partner-logos/microsoft.png') },
// ];

export interface ShowcaseCompany {
  name: string;
  logo: number;
}

export const SHOWCASE_COMPANIES: ShowcaseCompany[] = [];
