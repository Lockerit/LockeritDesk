import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Login from '../login/login';
import Ppal from '../ppal/ppal';
import KeyPad from '../dialogs/keypad';
import AdminLockers from '../admin/adminLockers';
import ErrorPage from '../utils/errorPage';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/ppal" element={<Ppal />} />
      <Route path="/keypad" element={<KeyPad />} />
      <Route path="/adminlockers" element={<AdminLockers />} />
      <Route path="*" element={<ErrorPage />} />
    </Routes>
  );
}
