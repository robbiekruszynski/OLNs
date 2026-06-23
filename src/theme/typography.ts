export const fonts = {
  regular: 'IBMPlexMono_400Regular',
  bold: 'IBMPlexMono_700Bold',
} as const;

export const typography = {
  xs: { fontFamily: fonts.regular, fontSize: 10 },
  sm: { fontFamily: fonts.regular, fontSize: 12 },
  md: { fontFamily: fonts.regular, fontSize: 13 },
  base: { fontFamily: fonts.regular, fontSize: 14 },
  lg: { fontFamily: fonts.regular, fontSize: 16 },
  xl: { fontFamily: fonts.regular, fontSize: 20 },
  xxl: { fontFamily: fonts.regular, fontSize: 24 },
} as const;
