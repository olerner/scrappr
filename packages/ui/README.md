# @scrappr/ui

React frontend for Scrappr.

![React](https://img.shields.io/badge/React-18-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Tailwind](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4) ![Vite](https://img.shields.io/badge/Vite-8-646CFF)

## Development

From the repo root:

```bash
yarn ui
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Tech Stack

- **React 18** + **TypeScript** (Vite)
- **Tailwind CSS** with emerald/green color scheme
- **Mapbox GL JS** for interactive map (requires token)
- **Zustand** for state management
- **React Router** for page navigation
- **Lucide React** for icons

## Pages

### Landing Page (`/`)

Hero section, commodity price stats, interactive map of nearby listings, how-it-works walkthrough for both user types, and CTA sections.

### Scrappee Dashboard (`/scrappee`)

List and manage scrap metal listings. Create new listings with photo upload, category selection, and location. Includes blocked category warnings (refrigerators, propane tanks, etc.) and prep checklists for appliances.

### Scrappr Dashboard (`/scrappr`)

Split map/list view for haulers. Filter by category, sort by distance/value/type, claim pickups, and track route value. Responsive layout with mobile tab switching.

## Mapbox Setup

To enable the interactive map, replace the placeholder token in `src/data/mockData.ts`:

```ts
export const MAPBOX_TOKEN = "your_mapbox_token_here";
```

Get a free token at [mapbox.com](https://account.mapbox.com/access-tokens/).

## Mock Data

Pre-populated with 8 realistic listings across Minneapolis/St. Paul including copper pipe, aluminum cans, appliances, a water heater, steel grill frame, and brass fittings.

## Project Structure

```
src/
  components/    # Shared UI (Header, MapView, CategoryIcon, etc.)
  pages/         # Landing, Scrappee Dashboard, Scrappr Dashboard
  data/          # Types, mock data, constants
  store/         # Zustand state management
```
