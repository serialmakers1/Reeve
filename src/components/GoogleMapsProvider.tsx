import { APIProvider } from '@vis.gl/react-google-maps';
import { Outlet } from 'react-router-dom';

export default function GoogleMapsProvider() {
  return (
    <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? ''}>
      <Outlet />
    </APIProvider>
  );
}
