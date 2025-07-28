// ErrorPage.jsx
import React from 'react';
import { useRouteError } from 'react-router-dom';

export default function ErrorPage() {
  const error = useRouteError();
  console.error(error);

  return (
    <div style={{ padding: '2rem' }}>
      <h1>¡Oops!</h1>
      <p>Ocurrió un error inesperado.</p>
      <p style={{ color: 'red' }}>{error.statusText || error.message}</p>
    </div>
  );
}