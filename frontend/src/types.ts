export interface Comment {
  id: number;
  text: string;
  createdAt: string;
}

export interface Hazard {
  id: number;
  lat: number;
  lng: number;
  type: string;
  description: string;
  imageUrl?: string | null;
  comments?: Comment[];
}
