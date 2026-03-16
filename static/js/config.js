// ./static/js/config.js
// ─────────────────────────────────────────────────────────────────────────────
// Supabase credentials — filled in automatically by apply-update.sh
// ─────────────────────────────────────────────────────────────────────────────
export const config = {
  supabaseUrl: 'https://ugywxsichbpgdloijbuq.supabase.co',
  supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVneXd4c2ljaGJwZ2Rsb2lqYnVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2OTAxNzUsImV4cCI6MjA4OTI2NjE3NX0.5I3lghhoMimp1-Z4fFo-nSJGxAFwyyejowdk_N_fZZA',
};
// ─────────────────────────────────────────────────────────────────────────────

export const shipsToPlaceTemplate = [
  { name: "Battleship",    size: 4, placed: false, positions: [] },
  { name: "Cruiser 1",     size: 3, placed: false, positions: [] },
  { name: "Cruiser 2",     size: 3, placed: false, positions: [] },
  { name: "Destroyer 1",   size: 2, placed: false, positions: [] },
  { name: "Destroyer 2",   size: 2, placed: false, positions: [] },
  { name: "Destroyer 3",   size: 2, placed: false, positions: [] },
  { name: "Patrol Boat 1", size: 1, placed: false, positions: [] },
  { name: "Patrol Boat 2", size: 1, placed: false, positions: [] },
  { name: "Patrol Boat 3", size: 1, placed: false, positions: [] },
  { name: "Patrol Boat 4", size: 1, placed: false, positions: [] },
];

export const totalShipCells = 20;

export const shipSizes = [
  { size: 4, count: 1 },
  { size: 3, count: 2 },
  { size: 2, count: 3 },
  { size: 1, count: 4 },
];
