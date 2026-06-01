# Terra Explore

Terra Explore is a static travel discovery web project built for the Web Technologies course at Kocaeli University. Users can search for countries, explore country details, see popular places, compare two countries, and keep a simple local profile with favorites and travel status.

## Features

- Search countries by name with autocomplete
- Select countries from an interactive Leaflet world map
- View country details such as capital, population, languages, and currencies
- Load popular places for each country and open them in Google Maps
- Compare two countries side by side
- Use demo `Sign Up`, `Login`, and `Profile` pages
- Save recent searches, favorite countries, favorite places, and `Visited / Want to Visit` status with `localStorage`
- See a rotating 3D globe on the home page

## Pages

- `index.html` – home page with search, globe, recent searches, and world map
- `country.html` – country detail page with map and popular places
- `compare-countries.html` – country comparison page
- `signup.html` – demo sign up page
- `login.html` – demo login page
- `profile.html` – user profile page

## Technologies

- HTML
- CSS
- JavaScript
- [Leaflet](https://leafletjs.com/) for maps
- [Globe.gl](https://globe.gl/) for the rotating 3D globe

## APIs Used

- [REST Countries](https://restcountries.com/)
- [GeoNames](https://www.geonames.org/)
- [OpenTripMap](https://opentripmap.io/)
- [Pixabay](https://pixabay.com/api/docs/)

## Setup

This project does not require a build step or Node.js.

1. Create your local config file:

   - Copy `js/config.example.js`
   - Rename the copy to `js/config.js`

2. Add your own API credentials to `js/config.js`:

   - `pixabay`
   - `geoNamesUsername`
   - `openTripMap`

3. Open `index.html` in a browser.

If your browser blocks some API behavior when opening the file directly, run the project with a simple local server instead.

## Config Notes

`js/config.js` includes:

- API base URLs
- API keys / usernames
- 24-hour cache settings
- GeoNames settings
- Popular places settings

`js/config.js` is meant to stay local. The repository should only include `js/config.example.js`.

## Project Structure

```text
Terra-Explore/
├── css/
├── js/
├── index.html
├── country.html
├── compare-countries.html
├── signup.html
├── login.html
├── profile.html
└── README.md
```

## Notes

- The signup and login flow is a frontend demo flow.
- User data and travel lists are stored locally in the browser with `localStorage`.
- If real API keys were ever committed before, they should be rotated.
