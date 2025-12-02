"use client";

import { useState } from "react";

interface TableRow {
  id: string;
  [key: string]: string | number;
}

export default function TableSection() {
  const [rows, setRows] = useState<TableRow[]>([]);
  const [columns, setColumns] = useState<string[]>(["სვეტი 1", "სვეტი 2"]);
  const [newColumnName, setNewColumnName] = useState("");

  const addColumn = () => {
    if (newColumnName.trim()) {
      setColumns([...columns, newColumnName.trim()]);
      setNewColumnName("");
    }
  };

  const removeColumn = (index: number) => {
    if (columns.length > 1) {
      const newColumns = columns.filter((_, i) => i !== index);
      setColumns(newColumns);
      // Remove data from removed column
      setRows(rows.map(row => {
        const newRow = { ...row };
        delete newRow[columns[index]];
        return newRow;
      }));
    }
  };

  const addRow = () => {
    const newRow: TableRow = {
      id: Date.now().toString(),
    };
    columns.forEach(col => {
      newRow[col] = "";
    });
    setRows([...rows, newRow]);
  };

  const removeRow = (id: string) => {
    setRows(rows.filter(row => row.id !== id));
  };

  const updateCell = (rowId: string, column: string, value: string) => {
    setRows(rows.map(row => 
      row.id === rowId ? { ...row, [column]: value } : row
    ));
  };

  const clearTable = () => {
    if (confirm("დარწმუნებული ხართ რომ გსურთ ტაბლის გასუფთავება?")) {
      setRows([]);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-black">ტაბელი</h2>
        <div className="flex space-x-2">
          <button
            onClick={addRow}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            + მწკრივის დამატება
          </button>
          <button
            onClick={clearTable}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
          >
            გასუფთავება
          </button>
        </div>
      </div>

      {/* Add Column */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <h3 className="text-lg font-semibold text-black mb-4">სვეტის დამატება</h3>
        <div className="flex space-x-2">
          <input
            type="text"
            value={newColumnName}
            onChange={(e) => setNewColumnName(e.target.value)}
            placeholder="სვეტის სახელი"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-black"
            onKeyPress={(e) => e.key === "Enter" && addColumn()}
          />
          <button
            onClick={addColumn}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            დამატება
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {columns.length > 0 ? (
          <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
            <thead className="bg-gray-50">
              <tr>
                {columns.map((col, index) => (
                  <th key={index} className="px-4 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider border border-gray-300">
                    <div className="flex items-center justify-between">
                      <span>{col}</span>
                      <button
                        onClick={() => removeColumn(index)}
                        className="text-red-600 hover:text-red-800 ml-2"
                        title="სვეტის წაშლა"
                      >
                        ×
                      </button>
                    </div>
                  </th>
                ))}
                <th className="px-4 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider border border-gray-300">
                  მოქმედებები
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rows.length === 0 ? (
                <tr>
                  <td 
                    colSpan={columns.length + 1} 
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    ტაბელი ცარიელია. დაამატეთ მწკრივები
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    {columns.map((col) => (
                      <td key={col} className="px-4 py-2 border border-gray-300">
                        <input
                          type="text"
                          value={row[col] || ""}
                          onChange={(e) => updateCell(row.id, col, e.target.value)}
                          className="w-full px-2 py-1 border border-gray-200 rounded text-black text-[16px] md:text-[18px] focus:outline-none focus:border-blue-500"
                        />
                      </td>
                    ))}
                    <td className="px-4 py-2 border border-gray-300">
                      <button
                        onClick={() => removeRow(row.id)}
                        className="text-red-600 hover:text-red-800 text-[16px] md:text-[18px]"
                      >
                        წაშლა
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-8 text-gray-500">
            დაამატეთ სვეტები ტაბლის გამოსაყენებლად
          </div>
        )}
      </div>
    </div>
  );
}

