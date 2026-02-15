export type Grouping = { layout: string };

export type PhotoMeta = {
  file: string;
  width: number;
  height: number;
  caption?: string;
  alt?: string;
  group?: string;
};

export type Fragment = {
  id: string;
  title: string;
  date: string;
  location: string;
  cover: string;
  description: string;
  photos: PhotoMeta[];
  groupings?: Record<string, Grouping>;
};
