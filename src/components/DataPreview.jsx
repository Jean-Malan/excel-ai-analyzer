import React from 'react';

const DataPreview = ({
  sheetData,
  headers,
  processedData,
  selectedInputColumns,
  outputColumn
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
      <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Data Preview</h2>
      
      {sheetData.length > 0 ? (
        <div className="overflow-auto max-h-96 border border-gray-200 rounded-md">
          <div className="min-w-full overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {headers.map((header, index) => (
                    <th
                      key={index}
                      className={`px-2 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 min-w-[120px] ${
                        selectedInputColumns.includes(index) ? 'bg-blue-100' : ''
                      } ${
                        parseInt(outputColumn) === index || (outputColumn === 'new' && index === headers.length - 1) ? 'bg-green-100' : ''
                      }`}
                    >
                      {header || `Column ${index + 1}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {processedData.slice(0, 10).map((row, rowIndex) => (
                  <tr key={rowIndex} className="hover:bg-gray-50">
                    {headers.map((_, colIndex) => (
                      <td
                        key={colIndex}
                        className={`px-2 sm:px-4 py-2 text-xs sm:text-sm text-gray-900 border-r border-gray-200 max-w-[150px] sm:max-w-xs truncate ${
                          selectedInputColumns.includes(colIndex) ? 'bg-blue-50' : ''
                        } ${
                          parseInt(outputColumn) === colIndex || (outputColumn === 'new' && colIndex === headers.length - 1) ? 'bg-green-50' : ''
                        }`}
                        title={row[colIndex]}
                      >
                        {row[colIndex] || ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          Upload an Excel file to see data preview
        </div>
      )}
      
      {sheetData.length > 10 && (
        <div className="mt-2 text-sm text-gray-500 text-center">
          Showing first 10 rows of {sheetData.length} total rows
        </div>
      )}
    </div>
  );
};

export default DataPreview;