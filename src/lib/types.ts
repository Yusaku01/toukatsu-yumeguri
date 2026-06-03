export type Coordinates = {
  lat: number;
  lng: number;
};

export type SpaTagGroupKey = "bath" | "sauna" | "access" | "family" | "food";

export type SpaTagGroups = Partial<Record<SpaTagGroupKey, string[]>>;

export type Spa = Coordinates & {
  id: string;
  name: string;
  city: string;
  area?: string;
  address: string;
  officialUrl: string;
  googleMapsUrl: string;
  tags: string[];
  tagGroups?: SpaTagGroups;
  notes?: string;
  lastCheckedAt: string;
};
