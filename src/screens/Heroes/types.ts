import type { Root } from 'hast';

export type Hero = {
  id: string;
  title: string;
  subtitle: string;
  cover: string;
  coverWidth: number;
  coverHeight: number;
  body: Root;
  location?: string;
  coverPosition?: string;
  linkLabel?: string;
  link?: string;
};
