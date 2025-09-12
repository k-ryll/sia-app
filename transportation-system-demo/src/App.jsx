import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Settings from './pages/Settings';
import { LanguageProvider } from './contexts/LanguageContext';
import './styles/global.css';
import './styles/nav.css';
import './styles/home.css';
import './styles/settings.css';

function App() {
  return (
    <LanguageProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Router>
    </LanguageProvider>
  );
}

export default App;