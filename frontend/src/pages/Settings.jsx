import React from 'react';
import { Settings as SettingsIcon, Save } from 'lucide-react';

const Settings = () => {
  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-6 border border-[#D7D3CF] rounded-[4px]">
        <div className="text-[10px] font-mono uppercase tracking-wider text-[#666666] font-semibold mb-1">
          SYSTEM & PREFERENCES
        </div>
        <h2 className="text-2xl font-bold text-[#111111] tracking-tight">Account Settings</h2>
        <p className="text-xs text-[#666666] mt-0.5">Manage user preferences and workspace configurations.</p>
      </div>

      {/* Settings Card */}
      <div className="bg-white border border-[#D7D3CF] rounded-[4px] p-6 space-y-5">
        <h4 className="text-[10px] font-mono uppercase tracking-wider text-[#666666] font-semibold pb-3 border-b border-[#D7D3CF] flex items-center gap-2">
          <SettingsIcon size={14} className="text-[#102326]" />
          GENERAL PREFERENCES
        </h4>

        <div className="space-y-4">
          <div className="space-y-1">
            <label className="block text-[10px] font-mono uppercase tracking-wider text-[#666666] font-semibold">
              FULL NAME
            </label>
            <input
              type="text"
              className="w-full bg-white border border-[#D7D3CF] focus:border-[#102326] rounded-[4px] px-3 py-2 text-xs font-mono text-[#111111] outline-none"
              defaultValue="Student User"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-mono uppercase tracking-wider text-[#666666] font-semibold">
              EMAIL ADDRESS
            </label>
            <input
              type="email"
              className="w-full bg-white border border-[#D7D3CF] focus:border-[#102326] rounded-[4px] px-3 py-2 text-xs font-mono text-[#111111] outline-none"
              defaultValue="student@university.edu"
            />
          </div>

          <div className="pt-2">
            <button className="px-4 py-2 bg-[#102326] text-white hover:bg-[#0b191c] rounded-[4px] text-xs font-mono font-semibold uppercase tracking-wider transition-colors inline-flex items-center gap-1.5">
              <Save size={14} />
              <span>SAVE CHANGES</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
