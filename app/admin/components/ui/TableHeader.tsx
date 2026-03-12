import React from "react";

interface TableHeaderProps {
  onAddEmployees: () => void;
  onShowMonthPopup: () => void;
  hasRows: boolean;
  onSaveAll: () => void;
}

export function TableHeader({
  onAddEmployees,
  onShowMonthPopup,
  hasRows,
  onSaveAll,
}: TableHeaderProps) {
  return (
    <div className="flex justify-between items-center mb-4">
      <h2 className="text-xl font-bold text-black">თანამშრომლების ტაბელი</h2>
      <div className="flex space-x-2">
        <button
          onClick={onAddEmployees}
          className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700"
        >
          + თანამშრომლების დამატება
        </button>

        <button
          onClick={onShowMonthPopup}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
        >
          თვეების მიხედვით
        </button>
        {hasRows && (
          <button
            onClick={onSaveAll}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            ყველას შენახვა
          </button>
        )}
      </div>
    </div>
  );
}

