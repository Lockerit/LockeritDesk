import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Login from '../login/login';
import Ppal from '../ppal/ppal';
import TabAdmin from '../admin/tabAdmin';
import ErrorPage from '../utils/errorPage';
import App from '../app/app';

export default function AppRoutes() {
  return (
    <Routes element={<App />}>
      <Route path="/" element={<Login />} />
      <Route path="/ppal" element={<Ppal />} />
      <Route path="/adminlockers" element={<TabAdmin />} />
      <Route path="*" element={<ErrorPage />} />
    </Routes>
  );
}
