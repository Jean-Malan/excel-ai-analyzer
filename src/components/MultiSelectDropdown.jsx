import React from 'react';
import Select from 'react-select';

const MultiSelectDropdown = ({ 
  options = [], 
  value = [], 
  onChange, 
  placeholder = "Select options...", 
  label = "",
  description = "",
  icon = "",
  className = "",
  theme = "green"
}) => {
  // Convert options to react-select format
  const selectOptions = options.map(option => ({
    value: option,
    label: option
  }));

  // Convert value to react-select format
  const selectValue = value.map(val => ({
    value: val,
    label: val
  }));

  // Handle selection change
  const handleChange = (selectedOptions) => {
    const selectedValues = selectedOptions ? selectedOptions.map(option => option.value) : [];
    onChange(selectedValues);
  };

  // Theme colors
  const themeColors = {
    green: {
      primary: '#059669', // green-600
      primary25: '#d1fae5', // green-100
      primary50: '#a7f3d0', // green-200
      neutral20: '#d1d5db', // gray-300
      neutral30: '#9ca3af', // gray-400
      neutral80: '#374151', // gray-700
    },
    blue: {
      primary: '#2563eb', // blue-600
      primary25: '#dbeafe', // blue-100
      primary50: '#bfdbfe', // blue-200
      neutral20: '#d1d5db',
      neutral30: '#9ca3af',
      neutral80: '#374151',
    }
  };

  const colors = themeColors[theme] || themeColors.green;

  // Custom styles for react-select
  const customStyles = {
    control: (provided, state) => ({
      ...provided,
      backgroundColor: 'rgba(255, 255, 255, 0.8)',
      borderColor: state.isFocused ? colors.primary : colors.neutral20,
      borderRadius: '0.5rem',
      borderWidth: '1px',
      boxShadow: state.isFocused ? `0 0 0 3px ${colors.primary25}` : 'none',
      padding: '2px',
      minHeight: '42px',
      maxHeight: '80px', // Limit height to prevent overflow
      fontSize: '14px',
      transition: 'all 0.2s ease',
      '&:hover': {
        borderColor: colors.primary,
      }
    }),
    valueContainer: (provided) => ({
      ...provided,
      maxHeight: '60px',
      overflowY: 'auto',
      padding: '2px 8px',
      flexWrap: 'wrap',
    }),
    multiValue: (provided) => ({
      ...provided,
      backgroundColor: colors.primary25,
      borderRadius: '9999px',
      fontSize: '12px',
      fontWeight: '500',
    }),
    multiValueLabel: (provided) => ({
      ...provided,
      color: colors.primary,
      paddingLeft: '8px',
      paddingRight: '4px',
    }),
    multiValueRemove: (provided) => ({
      ...provided,
      color: colors.primary,
      backgroundColor: 'transparent',
      borderRadius: '0 9999px 9999px 0',
      paddingLeft: '4px',
      paddingRight: '8px',
      '&:hover': {
        backgroundColor: colors.primary,
        color: 'white',
      }
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected 
        ? colors.primary 
        : state.isFocused 
        ? colors.primary25 
        : 'white',
      color: state.isSelected ? 'white' : colors.neutral80,
      fontSize: '14px',
      '&:hover': {
        backgroundColor: state.isSelected ? colors.primary : colors.primary25,
      }
    }),
    menu: (provided) => ({
      ...provided,
      borderRadius: '0.5rem',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      border: `1px solid ${colors.neutral20}`,
    }),
    menuList: (provided) => ({
      ...provided,
      maxHeight: '200px',
      borderRadius: '0.5rem',
    }),
    placeholder: (provided) => ({
      ...provided,
      color: colors.neutral30,
      fontSize: '14px',
    }),
    input: (provided) => ({
      ...provided,
      fontSize: '14px',
    }),
    indicatorSeparator: () => ({
      display: 'none'
    }),
    dropdownIndicator: (provided, state) => ({
      ...provided,
      color: colors.neutral30,
      transform: state.selectProps.menuIsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
      transition: 'transform 0.2s ease',
      '&:hover': {
        color: colors.primary,
      }
    })
  };

  return (
    <div className={className}>
      {label && (
        <label className={`block text-sm font-medium mb-2 ${
          theme === 'green' ? 'text-green-800' : 'text-blue-800'
        }`}>
          {icon && <span className="mr-2">{icon}</span>}
          {label}
        </label>
      )}
      {description && (
        <p className={`text-xs mb-3 ${
          theme === 'green' ? 'text-green-600' : 'text-blue-600'
        }`}>
          {description}
        </p>
      )}
      <Select
        isMulti
        options={selectOptions}
        value={selectValue}
        onChange={handleChange}
        placeholder={placeholder}
        styles={customStyles}
        theme={(selectTheme) => ({
          ...selectTheme,
          colors: {
            ...selectTheme.colors,
            ...colors
          }
        })}
        isSearchable={true}
        isClearable={false}
        closeMenuOnSelect={false}
        hideSelectedOptions={false}
        components={{
          IndicatorSeparator: null,
        }}
        menuPortalTarget={document.body}
        menuPosition="fixed"
      />
      
      {/* Show summary if many items selected */}
      {value.length > 4 && (
        <div className={`mt-2 text-xs ${
          theme === 'green' ? 'text-green-600' : 'text-blue-600'
        }`}>
          Selected: {value.slice(0, 3).join(', ')}{value.length > 3 && ` + ${value.length - 3} more`}
        </div>
      )}
    </div>
  );
};

export default MultiSelectDropdown;