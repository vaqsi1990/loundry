"use client";

import { useEffect, useState } from "react";

interface Employee {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  position: string;
  contractFile: string | null;
  canLogin: boolean;
  createdAt: string;
}

export default function EmployeesSection() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    position: "OTHER" as "MANAGER" | "MANAGER_ASSISTANT" | "COURIER" | "OTHER",
    canLogin: false,
    contractFile: null as File | null,
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await fetch("/api/admin/employees");
      if (!response.ok) {
        throw new Error("თანამშრომლების ჩატვირთვა ვერ მოხერხდა");
      }
      const data = await response.json();
      setEmployees(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "დაფიქსირდა შეცდომა");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const formDataToSend = new FormData();
    formDataToSend.append("name", formData.name);
    formDataToSend.append("phone", formData.phone);
    formDataToSend.append("position", formData.position);
    formDataToSend.append("canLogin", formData.canLogin.toString());
    if (formData.email) {
      formDataToSend.append("email", formData.email);
    }
    if (formData.contractFile) {
      formDataToSend.append("contractFile", formData.contractFile);
    }

    try {
      const url = editingId ? `/api/admin/employees/${editingId}` : "/api/admin/employees";
      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        body: formDataToSend,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "ოპერაცია ვერ მოხერხდა");
      }

      await fetchEmployees();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "დაფიქსირდა შეცდომა");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("დარწმუნებული ხართ რომ გსურთ წაშლა?")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/employees/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("წაშლა ვერ მოხერხდა");
      }

      await fetchEmployees();
    } catch (err) {
      setError(err instanceof Error ? err.message : "დაფიქსირდა შეცდომა");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      position: "OTHER",
      canLogin: false,
      contractFile: null,
    });
    setShowAddForm(false);
    setEditingId(null);
  };

  const handleEdit = (employee: Employee) => {
    setFormData({
      name: employee.name,
      email: employee.email || "",
      phone: employee.phone,
      position: employee.position as any,
      canLogin: employee.canLogin,
      contractFile: null,
    });
    setEditingId(employee.id);
    setShowAddForm(true);
  };

  const getPositionLabel = (position: string) => {
    switch (position) {
      case "MANAGER":
        return "მენეჯერი";
      case "MANAGER_ASSISTANT":
        return "მენეჯერ ასისტანტი";
      case "COURIER":
        return "კურიერი";
      default:
        return "სხვა";
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-black">იტვირთება...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-black">თანამშრომლები</h2>
        <button
          onClick={() => {
            resetForm();
            setShowAddForm(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + დამატება
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {showAddForm && (
        <div className="bg-gray-50 p-6 rounded-lg mb-6">
          <h3 className="text-lg font-semibold text-black mb-4">
            {editingId ? "რედაქტირება" : "ახალი თანამშრომელი"}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[16px] md:text-[18px] font-medium text-black mb-1">
                სახელი *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
              />
            </div>
            <div>
              <label className="block text-[16px] md:text-[18px] font-medium text-black mb-1">
                ელფოსტა
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
              />
            </div>
            <div>
              <label className="block text-[16px] md:text-[18px] font-medium text-black mb-1">
                ტელეფონი *
              </label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
              />
            </div>
            <div>
              <label className="block text-[16px] md:text-[18px] font-medium text-black mb-1">
                პოზიცია *
              </label>
              <select
                required
                value={formData.position}
                onChange={(e) => {
                  const pos = e.target.value as any;
                  setFormData({ 
                    ...formData, 
                    position: pos,
                    canLogin: ["MANAGER", "MANAGER_ASSISTANT", "COURIER"].includes(pos)
                  });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
              >
                <option value="OTHER">სხვა</option>
                <option value="MANAGER">მენეჯერი</option>
                <option value="MANAGER_ASSISTANT">მენეჯერ ასისტანტი</option>
                <option value="COURIER">კურიერი</option>
              </select>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="canLogin"
                checked={formData.canLogin}
                onChange={(e) => setFormData({ ...formData, canLogin: e.target.checked })}
                disabled={!["MANAGER", "MANAGER_ASSISTANT", "COURIER"].includes(formData.position)}
                className="mr-2"
              />
              <label htmlFor="canLogin" className="text-[16px] md:text-[18px] text-black">
                შეუძლია სისტემაში შესვლა (მხოლოდ მენეჯერი, მენეჯერ ასისტანტი და კურიერი)
              </label>
            </div>
            <div>
              <label className="block text-[16px] md:text-[18px] font-medium text-black mb-1">
                ხელშეკრულება (PDF)
              </label>
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => setFormData({ ...formData, contractFile: e.target.files?.[0] || null })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
              />
            </div>
            <div className="flex space-x-2">
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                {editingId ? "განახლება" : "დამატება"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-300 text-black px-4 py-2 rounded-lg hover:bg-gray-400"
              >
                გაუქმება
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                სახელი
              </th>
              <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                ელფოსტა
              </th>
              <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                ტელეფონი
              </th>
              <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                პოზიცია
              </th>
              <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                შესვლა
              </th>
              <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                ხელშეკრულება
              </th>
              <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                მოქმედებები
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {employees.map((employee) => (
              <tr key={employee.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px] text-black">
                  {employee.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px] text-black">
                  {employee.email || "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px] text-black">
                  {employee.phone}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px] text-black">
                  {getPositionLabel(employee.position)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px] text-black">
                  {employee.canLogin ? "✓" : "✗"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px]">
                  {employee.contractFile ? (
                    <a
                      href={employee.contractFile}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      ხედვა
                    </a>
                  ) : (
                    <span className="text-gray-500">-</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px]">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(employee)}
                      className="text-blue-600 hover:underline"
                    >
                      რედაქტირება
                    </button>
                    <button
                      onClick={() => handleDelete(employee.id)}
                      className="text-red-600 hover:underline"
                    >
                      წაშლა
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {employees.length === 0 && (
        <div className="text-center py-8 text-black">
          თანამშრომლები არ მოიძებნა
        </div>
      )}
    </div>
  );
}

