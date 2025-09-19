import React, { useState } from 'react';

interface HolidayGlowProps {
  prompt: string;
  setPrompt: (prompt: string) => void;
  holidayGlow: boolean;
  setHolidayGlow: (holidayGlow: boolean) => void;
}

const HolidayGlow: React.FC<HolidayGlowProps> = ({ prompt, setPrompt, holidayGlow, setHolidayGlow }) => {

  const presets = {
    "Classic": "Drape classic, warm white holiday lights along the roofline and frame the windows with glowing string lights. Add a festive wreath to the main door. The scene should be at dusk to emphasize the warm glow.",
    "Minimalist": "Add elegant, minimalist white holiday lights in straight lines along the eaves and vertical corners of the house. Place a single, tasteful spotlight on the front door. The overall mood should be modern and simple, at night.",
    "Santa's Village": "Transform the house into Santa's Village. Add colorful, vibrant lights everywhere, especially on the roof and around the porch. Place inflatable decorations like a snowman and reindeer in the yard. Add a layer of fresh, white snow on the ground and roof. The scene is cheerful and bustling with holiday spirit at night.",
  };

  const handlePreset = (preset: keyof typeof presets) => {
    const currentPrompt = prompt.split(', ').filter(p => !Object.values(presets).includes(p)).join(', ');
    setPrompt(currentPrompt + ', ' + presets[preset]);
  };

  return (
    <div className="flex flex-col gap-4 rounded-lg bg-gray-800 p-4">
      <div className="flex items-center justify-between">
        <label htmlFor="holiday-glow-toggle" className="text-lg font-semibold text-white">
          Holiday Glow
        </label>
        <input
          id="holiday-glow-toggle"
          type="checkbox"
          checked={holidayGlow}
          onChange={() => setHolidayGlow(!holidayGlow)}
          className="toggle toggle-success"
        />
      </div>
      {holidayGlow && (
        <div className="flex gap-2 overflow-x-auto py-2">
          {Object.keys(presets).map((preset) => (
            <button
              key={preset}
              onClick={() => handlePreset(preset as keyof typeof presets)}
              className="btn btn-outline btn-sm text-white"
            >
              {preset}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default HolidayGlow;
