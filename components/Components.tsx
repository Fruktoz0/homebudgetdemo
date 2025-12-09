import React from 'react';

// --- Card ---
export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-surface rounded-xl shadow-sm border border-gray-100 p-4 ${className}`}>
    {children}
  </div>
);

// --- Button ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'outline';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', fullWidth, className = '', ...props }) => {
  const baseStyle = "px-4 py-3 rounded-lg font-medium transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-primary text-white hover:bg-[#4A89DC] shadow-md shadow-blue-200",
    secondary: "bg-accent text-white hover:opacity-90",
    danger: "bg-danger text-white hover:opacity-90",
    success: "bg-success text-white hover:opacity-90",
    outline: "bg-transparent border-2 border-primary text-primary hover:bg-blue-50"
  };

  return (
    <button 
      className={`${baseStyle} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

// --- Input ---
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input: React.FC<InputProps> = ({ label, className = '', ...props }) => (
  <div className="mb-4">
    {label && <label className="block text-textSecondary text-sm font-medium mb-1">{label}</label>}
    <input 
      className={`w-full bg-background border border-gray-200 rounded-lg px-4 py-3 text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all ${className}`}
      {...props}
    />
  </div>
);

// --- Select ---
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: string[];
}

export const Select: React.FC<SelectProps> = ({ label, options, className = '', ...props }) => (
  <div className="mb-4">
    {label && <label className="block text-textSecondary text-sm font-medium mb-1">{label}</label>}
    <select 
      className={`w-full bg-background border border-gray-200 rounded-lg px-4 py-3 text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none ${className}`}
      {...props}
    >
      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  </div>
);