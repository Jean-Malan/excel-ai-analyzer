import React from 'react';
import { Upload, Settings, Play, Download, CheckCircle } from 'lucide-react';

const ProgressSteps = ({ currentStep }) => {
  const getStepStatus = (step) => {
    if (step < currentStep) return 'completed';
    if (step === currentStep) return 'current';
    return 'pending';
  };

  const steps = [
    { step: 1, label: 'Upload File', icon: Upload },
    { step: 2, label: 'Configure', icon: Settings },
    { step: 3, label: 'Process', icon: Play },
    { step: 4, label: 'Download', icon: Download }
  ];

  return (
    <div className="flex justify-center mb-6 sm:mb-8">
      <div className="flex items-center justify-center max-w-full overflow-x-auto px-4">
        {steps.map(({ step, label, icon: Icon }) => (
          <div key={step} className="flex items-center flex-shrink-0">
            <div className="flex flex-col items-center">
              <div className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 ${
                getStepStatus(step) === 'completed' 
                  ? 'bg-green-500 border-green-500 text-white' 
                  : getStepStatus(step) === 'current'
                  ? 'bg-indigo-500 border-indigo-500 text-white'
                  : 'bg-gray-200 border-gray-300 text-gray-500'
              }`} title={label}>
                {getStepStatus(step) === 'completed' ? (
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                ) : (
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
              </div>
              <span className={`mt-1 text-xs sm:text-sm font-medium text-center ${
                getStepStatus(step) === 'pending' ? 'text-gray-500' : 'text-gray-900'
              }`}>
                {label}
              </span>
            </div>
            {step < 4 && <div className="w-4 sm:w-8 h-0.5 bg-gray-300 mx-2 sm:mx-4" />}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProgressSteps;