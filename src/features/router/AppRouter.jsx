import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Login } from '@features/login/Login.jsx';
import { Ppal } from '@features/ppal/Ppal.jsx';
import { TabAdmin } from '@features/admin/TabAdmin.jsx';
import { ErrorPage } from '@features/feedback/ErrorPage.jsx';
import { App } from '@app/app';

export const AppRoutes = () => {
  return (
    <Routes element={<App />}>
      <Route path="/" element={<Login />} />
      <Route path="/ppal" element={<Ppal />} />
      <Route path="/adminlockers" element={<TabAdmin />} />
      <Route path="*" element={<ErrorPage />} />
    </Routes>
  );
}
