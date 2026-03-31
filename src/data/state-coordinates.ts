// SVG coordinates for each state capital, calibrated against the Nigeria outline path.
// Outline bounding box: x=188-686, y=80-543
// Geographic bounds: lat 4.27-13.89, lng 2.67-14.68

export interface StateMapPoint {
  x: number;
  y: number;
  label: string;
  labelDir?: 'left' | 'right'; // label placement direction, default 'right'
}

// Calibrated projection: maps real lat/lng to the outline's SVG coordinate space
function geoToSvg(lat: number, lng: number): { x: number; y: number } {
  // Nigeria geographic extremes
  const minLng = 2.6, maxLng = 14.8;
  const minLat = 4.2, maxLat = 14.0;
  // Map to outline bounding box with small inset
  const svgMinX = 192, svgMaxX = 680;
  const svgMinY = 85, svgMaxY = 535;

  const x = svgMinX + ((lng - minLng) / (maxLng - minLng)) * (svgMaxX - svgMinX);
  const y = svgMaxY - ((lat - minLat) / (maxLat - minLat)) * (svgMaxY - svgMinY);
  return { x: Math.round(x), y: Math.round(y) };
}

// State capitals with real geographic coordinates and display labels
const stateCapitals: Record<string, { lat: number; lng: number; label: string; labelDir?: 'left' | 'right' }> = {
  'abia':        { lat: 5.53, lng: 7.49, label: 'Umuahia' },
  'adamawa':     { lat: 9.33, lng: 12.40, label: 'Yola' },
  'akwa-ibom':   { lat: 5.01, lng: 7.85, label: 'Uyo' },
  'anambra':     { lat: 6.21, lng: 6.96, label: 'Awka' },
  'bauchi':      { lat: 10.31, lng: 9.84, label: 'Bauchi' },
  'bayelsa':     { lat: 4.92, lng: 6.27, label: 'Yenagoa' },
  'benue':       { lat: 7.73, lng: 8.54, label: 'Makurdi' },
  'borno':       { lat: 11.83, lng: 13.15, label: 'Maiduguri' },
  'cross-river': { lat: 4.95, lng: 8.33, label: 'Calabar' },
  'delta':       { lat: 5.89, lng: 5.68, label: 'Asaba', labelDir: 'left' },
  'ebonyi':      { lat: 6.26, lng: 8.07, label: 'Abakaliki' },
  'edo':         { lat: 6.34, lng: 5.63, label: 'Benin', labelDir: 'left' },
  'ekiti':       { lat: 7.63, lng: 5.22, label: 'Ado-Ekiti', labelDir: 'left' },
  'enugu':       { lat: 6.44, lng: 7.50, label: 'Enugu' },
  'fct':         { lat: 9.06, lng: 7.49, label: 'Abuja' },
  'gombe':       { lat: 10.29, lng: 11.17, label: 'Gombe' },
  'imo':         { lat: 5.49, lng: 7.03, label: 'Owerri' },
  'jigawa':      { lat: 12.23, lng: 9.56, label: 'Dutse' },
  'kaduna':      { lat: 10.52, lng: 7.43, label: 'Kaduna' },
  'kano':        { lat: 12.00, lng: 8.52, label: 'Kano' },
  'katsina':     { lat: 13.01, lng: 7.60, label: 'Katsina' },
  'kebbi':       { lat: 12.45, lng: 4.20, label: 'B. Kebbi', labelDir: 'left' },
  'kogi':        { lat: 7.80, lng: 6.73, label: 'Lokoja' },
  'kwara':       { lat: 8.50, lng: 4.55, label: 'Ilorin', labelDir: 'left' },
  'lagos':       { lat: 6.52, lng: 3.38, label: 'Lagos', labelDir: 'left' },
  'nasarawa':    { lat: 8.49, lng: 8.52, label: 'Lafia' },
  'niger':       { lat: 9.62, lng: 6.55, label: 'Minna' },
  'ogun':        { lat: 7.16, lng: 3.35, label: 'Abeokuta', labelDir: 'left' },
  'ondo':        { lat: 7.25, lng: 5.20, label: 'Akure' },
  'osun':        { lat: 7.77, lng: 4.56, label: 'Osogbo', labelDir: 'left' },
  'oyo':         { lat: 7.38, lng: 3.93, label: 'Ibadan', labelDir: 'left' },
  'plateau':     { lat: 9.93, lng: 8.89, label: 'Jos' },
  'rivers':      { lat: 4.81, lng: 7.01, label: 'PH' },
  'sokoto':      { lat: 13.06, lng: 5.24, label: 'Sokoto' },
  'taraba':      { lat: 7.87, lng: 9.78, label: 'Jalingo' },
  'yobe':        { lat: 11.75, lng: 11.97, label: 'Damaturu' },
  'zamfara':     { lat: 12.17, lng: 6.66, label: 'Gusau' },
};

// Build the coordinate map
export const STATE_COORDS: Record<string, StateMapPoint> = {};

for (const [slug, info] of Object.entries(stateCapitals)) {
  const { x, y } = geoToSvg(info.lat, info.lng);
  STATE_COORDS[slug] = { x, y, label: info.label, labelDir: info.labelDir };
}
