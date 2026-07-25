import React from 'react';
import { Search, Bell, Menu } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { UserButton } from '@clerk/react';

const Navbar = ({ user, scrolled, onToggleSidebar }) => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <header
      className="flex justify-between items-center px-4 md:px-8 py-3.5 bg-[#F7F5F2] border-b border-[#D7D3CF] shrink-0"
    >
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-1.5 text-[#102326] hover:bg-[#ECEAE7] rounded-[4px] lg:hidden transition-colors"
          title="Open Menu"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Right Top Header Actions */}
      <div className="flex items-center gap-2 md:gap-4">
        <button 
          onClick={() => navigate('/dashboard/chat')}
          className="p-1.5 text-[#666666] hover:text-[#111111] hover:bg-[#ECEAE7] rounded-[4px] transition-colors"
          title="Search / AI Assistance"
        >
          <Search size={18} strokeWidth={2} />
        </button>

        <button 
          onClick={() => navigate('/dashboard/revision')}
          className="p-1.5 text-[#666666] hover:text-[#111111] hover:bg-[#ECEAE7] rounded-[4px] transition-colors relative"
          title="Notifications & Schedule"
        >
          <Bell size={18} strokeWidth={2} />
        </button>

        <div className="flex items-center pl-2 border-l border-[#D7D3CF]">
          <UserButton 
            afterSignOutUrl="/" 
            userProfileMode="navigation"
            userProfileUrl="/dashboard/profile"
          />
        </div>
      </div>
    </header>
  );
};

export default Navbar;
