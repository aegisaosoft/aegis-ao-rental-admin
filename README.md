# Aegis AO Rental Admin

Aegis AO Rental Admin Dashboard - React TypeScript application for managing the Aegis AO rental platform.

## Features

- **Authentication**: Login with user ID and password from `aegis_users` table
- **Protected Routes**: Dashboard requires authentication
- **Modern UI**: Clean, responsive design with Tailwind CSS
- **Completely Independent**: Standalone React app with its own routing and state management

## Environment Configuration

### Development
- Admin Frontend: `https://localhost:4000/`
- API Backend: `https://localhost:7163/api`

### Production
- Frontend: Azure deployment
- API: `https://aegis-ao-rental-h4hda5gmengyhyc9.canadacentral-01.azurewebsites.net/api`

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [https://localhost:4000](https://localhost:4000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

### `npm test`

Launches the test runner in the interactive watch mode.\

## Project Structure

```
src/
├── context/
│   └── AuthContext.tsx      # Authentication context and state management
├── pages/
│   ├── Login.tsx            # Login page
│   └── Dashboard.tsx        # Main dashboard (protected route)
├── services/
│   └── api.ts              # Axios configuration and interceptors
├── App.tsx                 # Main app component with routing
├── index.tsx               # Entry point
└── index.css              # Global styles with Tailwind
```

## Authentication

The admin app authenticates against the `aegis_users` table using:
- **Endpoint**: `/api/aegis-admin/login`
- **Fields**: `userId` and `password`
- **Roles**: `agent` or `admin`

JWT tokens are stored in localStorage and automatically included in API requests.

## API Integration

All API calls go through the configured API URL:
- Uses environment variables: `REACT_APP_API_URL`
- Automatic token injection via axios interceptors
- Error handling with 401 redirect to login

## Learn More

- [React Documentation](https://reactjs.org/)
- [React Router](https://reactrouter.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Axios](https://axios-http.com/)
