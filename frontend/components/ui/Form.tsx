import React from 'react';

interface FormFieldProps {
  label: string;
  id: string;
  type?: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
  textarea?: boolean;
  selectOptions?: { value: string; label: string }[];
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  id,
  type = 'text',
  value,
  onChange,
  error,
  required = false,
  placeholder,
  textarea = false,
  selectOptions
}) => {
  return (
    <div className="mb-4">
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      {selectOptions ? (
        <select
          id={id}
          value={value as string}
          onChange={onChange as React.ChangeEventHandler<HTMLSelectElement>}
          className={`regal-input w-full ${error ? 'border-red-500' : ''}`}
          required={required}
        >
          <option value="">Select {label}</option>
          {selectOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : textarea ? (
        <textarea
          id={id}
          value={value as string}
          onChange={onChange as React.ChangeEventHandler<HTMLTextAreaElement>}
          placeholder={placeholder}
          className={`regal-input w-full ${error ? 'border-red-500' : ''}`}
          required={required}
        />
      ) : (
        <input
          type={type}
          id={id}
          value={value}
          onChange={onChange as React.ChangeEventHandler<HTMLInputElement>}
          placeholder={placeholder}
          className={`regal-input w-full ${error ? 'border-red-500' : ''}`}
          required={required}
        />
      )}

      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
};

interface FormProps {
  children: React.ReactNode;
  onSubmit: (e: React.FormEvent) => void;
  className?: string;
}

export const Form: React.FC<FormProps> = ({ children, onSubmit, className = '' }) => {
  return (
    <form onSubmit={onSubmit} className={`space-y-6 ${className}`}>
      {children}
    </form>
  );
};

export default { FormField, Form };