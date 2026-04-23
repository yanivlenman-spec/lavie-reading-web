import { useState } from 'react';

export default function PinInput({ title = 'הזן קוד PIN', onSuccess, onCancel }) {
  const [pin, setPin] = useState('');

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      if (pin === '1979') {
        onSuccess();
      } else {
        alert('קוד PIN שגוי');
        setPin('');
      }
    }
  };

  const handleClick = (num) => {
    if (pin.length < 4) {
      setPin(pin + num);
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-sm text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
        <p className="text-sm text-gray-600 mb-6">הזן את קוד ה-PIN שלך</p>

        <div className="mb-8 flex justify-center gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-xl font-bold text-gray-900 border-2 border-gray-300"
            >
              {pin[i] ? '•' : ''}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleClick(num)}
              className="py-3 rounded-lg bg-blue-500 text-white font-bold text-lg hover:bg-blue-600 transition"
            >
              {num}
            </button>
          ))}
          <button
            onClick={() => handleClick(0)}
            className="py-3 rounded-lg bg-blue-500 text-white font-bold text-lg hover:bg-blue-600 transition col-span-2"
          >
            0
          </button>
          <button
            onClick={handleBackspace}
            className="py-3 rounded-lg bg-gray-300 text-gray-900 font-bold text-lg hover:bg-gray-400 transition"
          >
            ←
          </button>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-lg bg-gray-300 text-gray-900 font-bold hover:bg-gray-400 transition"
          >
            ביטול
          </button>
          <button
            onClick={() => {
              if (pin === '1979') {
                onSuccess();
              } else {
                alert('קוד PIN שגוי');
                setPin('');
              }
            }}
            className="flex-1 py-3 rounded-lg bg-green-500 text-white font-bold hover:bg-green-600 transition"
          >
            אישור
          </button>
        </div>
      </div>
    </div>
  );
}
