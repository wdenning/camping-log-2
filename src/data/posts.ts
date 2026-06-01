export type PostStatus = 'completed' | 'planned';

export type Post = {
  slug: string;
  title: string;
  section: string;
  state: 'CA' | 'OR' | 'WA';
  date: string;
  description: string;
  gpxFile: string | null;
  pctMileStart: number;
  pctMileEnd: number;
  status: PostStatus;
  startCoord?: [number, number]; // [lng, lat] from Halfmile reference data
  endCoord?: [number, number];   // [lng, lat] from Halfmile reference data
};

export const POSTS: Post[] = [
  {
    slug: 'echo-lake-to-sierra-city',
    title: 'Echo Lake to Sierra City',
    section: 'J/K',
    state: 'CA',
    date: 'Day 1-9',
    description:
      'Starting the flip-flop at Echo Lake near South Lake Tahoe, crossing rolling Sierra granite past Donner Pass and dropping through the Tahoe National Forest to Sierra City.',
    gpxFile: null,
    pctMileStart: 1093.4,
    pctMileEnd: 1195,
    status: 'planned',
    startCoord: [-120.043836, 38.834584], // Halfmile CA Sec J: Echo Lake (Echo Chalet Store)
    endCoord: [-120.608038, 39.580019],   // Halfmile CA Sec L WA1195: North Yuba River, near Sierra City
  },
];
