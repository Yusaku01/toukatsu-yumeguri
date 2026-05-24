export type Coordinates = {
  lat: number;
  lng: number;
};

export type Spa = Coordinates & {
  id: string;
  name: string;
  city: string;
  area?: string;
  address: string;
  officialUrl: string;
  googleMapsUrl: string;
  tags: string[];
  notes?: string;
  lastCheckedAt: string;
};
