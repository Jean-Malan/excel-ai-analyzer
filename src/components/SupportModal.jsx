import React from 'react';
import { Heart, Coffee, X } from 'lucide-react';

const SupportModal = ({ show, onClose }) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Heart className="w-6 h-6 text-red-500 mr-2" />
              <h2 className="text-xl font-semibold text-gray-900">Enjoying Excel AI Analyzer?</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Content */}
          <div className="text-center">
            <div className="mb-4">
              <Coffee className="w-16 h-16 text-amber-600 mx-auto mb-3" />
              <p className="text-gray-600 mb-2">
                Your file has been downloaded successfully! 🎉
              </p>
              <p className="text-gray-600">
                If this tool saved you time and effort, consider buying me a coffee to support continued development!
              </p>
            </div>
            
            {/* Buy Me a Coffee Button */}
            <div className="space-y-3">
              <a
                href="https://buymeacoffee.com/iamjeanmalan"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-amber-500 hover:bg-amber-600 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
              >
                <Coffee className="w-5 h-5 mr-2" />
                Buy Me a Coffee
              </a>
              
              <button
                onClick={onClose}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-6 rounded-lg transition-colors"
              >
                Maybe Later
              </button>
            </div>
            
            <p className="text-xs text-gray-500 mt-3">
              This tool will always remain free to use
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupportModal;