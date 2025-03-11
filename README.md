
# OmFortune - Fortune Telling Application

OmFortune is a modern fortune telling web application that provides users with personalized fortune readings based on their name, birth date, and zodiac sign.

## Features

- User-friendly fortune telling interface
- Tarot card readings
- Personalized horoscopes
- Backend API for data storage and retrieval
- Admin dashboard for monitoring and analytics

## Tech Stack

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js, Express.js
- **Database**: SQLite
- **Deployment**: Replit

## API Documentation

The backend provides the following RESTful API endpoints:

### Visitor Tracking

- `GET /api/visitors` - Get total visitor count
- `POST /api/visitors` - Record a new visitor

### Fortune Management

- `GET /api/fortunes` - Get list of fortunes (supports pagination)
- `POST /api/fortunes` - Create a new fortune record
  - Required fields: `name`, `zodiac`, `fortune`
  - Optional fields: `birthDate`, `deviceInfo`, `sessionDuration`

### Statistics

- `GET /api/stats/daily` - Get daily statistics (visitors, fortunes, zodiac distribution)
  - Query parameters: `days` (default: 30)

## Development

To run the project locally:

1. Clone the repository
2. Install dependencies: `npm install`
3. Start the server: `node server.js`
4. Visit `http://localhost:3000` in your browser

## Deployment

The application is configured for deployment on Replit. The `.replit` file contains the necessary configuration.

## License

This project is proprietary and confidential.
