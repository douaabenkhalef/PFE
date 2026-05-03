// frontend/src/components/PasswordInput.jsx
import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

const PasswordInput = ({ 
  value, 
  onChange, 
  placeholder, 
  label,
  required = true,
  className = "",
  icon = null
}) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative">
      {icon && <span className="icon">{icon}</span>}
      <input
        type={showPassword ? "text" : "password"}
        placeholder={placeholder || label}
        value={value}
        onChange={onChange}
        required={required}
        className={className || "w-full bg-transparent outline-none text-white pr-10"}
      />
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="absolute right-0 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition"
        style={{ right: icon ? '30px' : '0' }}
      >
        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
};

export default PasswordInput;