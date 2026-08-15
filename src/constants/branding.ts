export const BRAND_LOGO_LIGHT = "https://res.cloudinary.com/doujptiz/image/upload/f_auto,q_auto:good,w_256,c_limit/v1785982713/1785982475017_efn0fp.png";
export const BRAND_LOGO_DARK = "https://res.cloudinary.com/doujptiz/image/upload/f_auto,q_auto:good,w_256,c_limit/v1785988903/file_0000000090208246b8ee84f3f9f2bfe2_hxbnbi.png";

/**
 * Returns the appropriate brand logo and site icon URL based on active theme.
 */
export function getBrandLogo(isDark: boolean): string {
  return isDark ? BRAND_LOGO_DARK : BRAND_LOGO_LIGHT;
}
