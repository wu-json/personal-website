export function photoUrl(
  fragmentId: string,
  file: string,
  size: 'placeholder' | 'small' | 'thumb' | 'full',
): string {
  return `/images/fragments/${fragmentId}/${file}-${size}.webp`;
}

export function heroImageUrl(
  id: string,
  file: string,
  size: 'placeholder' | 'thumb' | 'full',
): string {
  return `/images/heroes/${id}/${file}-${size}.webp`;
}

export function constructImageUrl(
  id: string,
  file: string,
  size: 'placeholder' | 'thumb' | 'full',
): string {
  return `/images/constructs/${id}/${file}-${size}.webp`;
}
