import React from 'react';

const DataPreview = ({
  sheetData,
  headers,
  processedData,
  selectedInputColumns,
  outputColumn
}) => {
  return (
    <div className="card p-5">
      <h2 className="mb-3">Data Preview</h2>
      
      {sheetData.length > 0 ? (
        <div className="table-shell max-h-96">
          <div className="min-w-full overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  {headers.map((header, index) => (
                    <th
                      key={index}
                      className={`th min-w-[120px] ${
                        selectedInputColumns.includes(index) ? 'bg-neutral-100' : ''
                      } ${
                        parseInt(outputColumn) === index || (outputColumn === 'new' && index === headers.length - 1) ? 'bg-neutral-100' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="truncate">{header || `Column ${index + 1}`}</span>
                        {selectedInputColumns.includes(index) && (
                          <span className="btn-pill">Input</span>
                        )}
                        {(parseInt(outputColumn) === index || (outputColumn === 'new' && index === headers.length - 1)) && (
                          <span className="btn-pill">Output</span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {processedData.slice(0, 100).map((row, rowIndex) => (
                  <tr key={rowIndex} className="hover:bg-neutral-50">
                    {headers.map((_, colIndex) => (
                      <td
                        key={colIndex}
                        className={`td max-w-[150px] sm:max-w-xs truncate ${
                          selectedInputColumns.includes(colIndex) ? 'bg-neutral-50' : ''
                        } ${
                          parseInt(outputColumn) === colIndex || (outputColumn === 'new' && colIndex === headers.length - 1) ? 'bg-neutral-50' : ''
                        }`}
                        title={String(row[colIndex] || '')}
                      >
                        {(() => {
                          const cellValue = row[colIndex];
                          if (cellValue === null || cellValue === undefined) {
                            return '';
                          }
                          if (typeof cellValue === 'string' || typeof cellValue === 'number' || typeof cellValue === 'boolean') {
                            return String(cellValue);
                          }
                          if (typeof cellValue === 'object') {
                            return JSON.stringify(cellValue);
                          }
                          return String(cellValue);
                        })()}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 muted">
          Upload an Excel file to see data preview
        </div>
      )}
      
      {sheetData.length > 10 && (
        <div className="mt-2 text-sm muted text-center">
          Showing first 10 rows of {sheetData.length} total rows
        </div>
      )}
    </div>
  );
};

export default DataPreview;
