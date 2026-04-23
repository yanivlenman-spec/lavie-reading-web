import { useState } from 'react';
import storiesData from '../data/stories.json';

export default function HomeScreen({ onSelectStory }) {
  const [expandedEpisode, setExpandedEpisode] = useState(1);

  const storysByEpisode = {};
  storiesData.stories.forEach(story => {
    if (!storysByEpisode[story.episode]) {
      storysByEpisode[story.episode] = [];
    }
    storysByEpisode[story.episode].push(story);
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4">
      {/* Header */}
      <div className="text-center mb-8 pt-4">
        <h1 className="text-4xl font-bold text-blue-900 mb-2">Lavie</h1>
        <p className="text-gray-600">Learn Hebrew through reading</p>
      </div>

      {/* Episodes */}
      <div className="max-w-2xl mx-auto space-y-4">
        {storiesData.episodes.map(episode => (
          <div key={episode.id} className="bg-white rounded-lg shadow overflow-hidden">
            {/* Episode Header */}
            <button
              onClick={() => setExpandedEpisode(expandedEpisode === episode.id ? null : episode.id)}
              className="w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition text-right"
              style={{ backgroundColor: `${episode.color}20` }}
            >
              <span className="text-3xl flex-shrink-0">{episode.emoji}</span>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-gray-900">{episode.title}</h2>
                <p className="text-sm text-gray-600">{episode.storyCount} stories</p>
              </div>
              <span className="text-xl text-gray-400">
                {expandedEpisode === episode.id ? '−' : '+'}
              </span>
            </button>

            {/* Stories List */}
            {expandedEpisode === episode.id && (
              <div className="divide-y">
                {storysByEpisode[episode.id]?.map(story => (
                  <button
                    key={story.id}
                    onClick={() => onSelectStory(story.id)}
                    className="w-full p-4 hover:bg-blue-50 transition text-right flex items-center gap-3"
                  >
                    {/* Difficulty dots */}
                    <div className="flex gap-1 flex-shrink-0">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <span
                          key={i}
                          className={`w-2 h-2 rounded-full ${
                            i < story.difficulty ? 'bg-yellow-400' : 'bg-gray-300'
                          }`}
                        />
                      ))}
                    </div>

                    {/* Story title */}
                    <h3 className="flex-1 font-medium text-gray-900">{story.title}</h3>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-12 text-center text-sm text-gray-500">
        <p>Tap a story to begin reading</p>
      </div>
    </div>
  );
}
