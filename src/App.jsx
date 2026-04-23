import { useState } from 'react';
import { AppProvider } from './context/AppContext';
import HomeScreen from './screens/HomeScreen';
import StoryScreen from './screens/StoryScreen';

export default function App() {
  const [screen, setScreen] = useState('home');

  return (
    <AppProvider>
      {screen === 'home' ? (
        <HomeScreen onSelectStory={setScreen} />
      ) : (
        <StoryScreen storyId={screen} onBack={() => setScreen('home')} />
      )}
    </AppProvider>
  );
}
