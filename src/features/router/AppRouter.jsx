import { Routes, Route } from 'react-router-dom';

import { TabAdmin } from '@features/admin/TabAdmin.jsx';
import { Login } from '@features/login/Login.jsx';
import { Ppal } from '@features/ppal/Ppal.jsx';

export const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/ppal" element={<Ppal />} />
      <Route path="/adminlockers" element={<TabAdmin />} />
    </Routes>
  );
}
