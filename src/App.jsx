import { useState } from 'react';
import HomeScreen from './screens/HomeScreen';
import StoryScreen from './screens/StoryScreen';

export default function App() {
  const [screen, setScreen] = useState('home');

  return screen === 'home' ? (
    <HomeScreen onSelectStory={setScreen} />
  ) : (
    <StoryScreen storyId={screen} onBack={() => setScreen('home')} />
  );
}
