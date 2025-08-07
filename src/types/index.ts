export interface ImageData {
  id: number;
  file: Blob;
  src: string;
  base64: string;
  panelId: string;
  lat: number | null;
  lon: number | null;
  analysis?: string;
  panelIdParts: {
    type: string;
    route: string;
    carrefour: string;
    ensemble: string;
  };
}

export interface ReportData {
  summary: string;
  recommendation: string;
  priorities: string[];
}
