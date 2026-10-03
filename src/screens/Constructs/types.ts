import type { Root } from 'hast';

export type Construct = {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  cover: string;
  coverWidth: number;
  coverHeight: number;
  body: Root;
  coverPosition?: string;
  linkLabel?: string;
  link?: string;
};
