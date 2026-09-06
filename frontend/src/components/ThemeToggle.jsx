import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button className="theme-toggle" type="button" onClick={toggleTheme}
      aria-label={isDark ? 'Enable light mode' : 'Enable dark mode'} title={isDark ? 'Light mode' : 'Dark mode'}>
      {isDark ? <Sun size={17} /> : <Moon size={17} />}
      <span>{isDark ? 'Light mode' : 'Dark mode'}</span>
    </button>
  );
}
