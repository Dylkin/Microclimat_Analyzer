export interface ContactPerson {
  id: string;
  name: string;
  phone: string;
  comment?: string;
}

export interface Contractor {
  id: string;
  name: string;
  address: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  contactPersons: ContactPerson[];
  createdAt: Date;
  updatedAt: Date;
}