"use client";

import { useEffect, useState } from "react";

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
  mobileNumber: string | null;
  createdAt: string;
}

export default function UsersSection() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/admin/users");
      if (!response.ok) {
        throw new Error("მომხმარებლების ჩატვირთვა ვერ მოხერხდა");
      }
      const data = await response.json();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "დაფიქსირდა შეცდომა");
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: "MANAGER" | "MANAGER_ASSISTANT" | "USER") => {
    setUpdating(userId);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "როლის შეცვლა ვერ მოხერხდა");
      }

      setUsers(users.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : "დაფიქსირდა შეცდომა");
    } finally {
      setUpdating(null);
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "ადმინისტრატორი";
      case "MANAGER":
        return "მენეჯერი";
      case "MANAGER_ASSISTANT":
        return "მენეჯერ ასისტანტი";
      case "USER":
        return "მომხმარებელი";
      default:
        return role;
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-black">იტვირთება...</div>;
  }

  return (
    <div>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
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
                მობილური
              </th>
              <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                როლი
              </th>
              <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                რეგისტრაციის თარიღი
              </th>
              <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                მოქმედებები
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px] text-black">
                  {user.name || "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px] text-black">
                  {user.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px] text-black">
                  {user.mobileNumber || "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px] text-black">
                  {getRoleLabel(user.role)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px] text-black">
                  {new Date(user.createdAt).toLocaleDateString("ka-GE")}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px]">
                  {user.role !== "ADMIN" && (
                    <div className="flex space-x-2">
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value as "MANAGER" | "MANAGER_ASSISTANT" | "USER")}
                        disabled={updating === user.id}
                        className="px-3 py-1 border border-gray-300 rounded-md text-[16px] md:text-[18px] text-black bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="USER">მომხმარებელი</option>
                        <option value="MANAGER">მენეჯერი</option>
                        <option value="MANAGER_ASSISTANT">მენეჯერ ასისტანტი</option>
                      </select>
                      {updating === user.id && (
                        <span className="text-xs text-gray-500">მიმდინარეობს...</span>
                      )}
                    </div>
                  )}
                  {user.role === "ADMIN" && (
                    <span className="text-[16px] md:text-[18px] text-gray-500">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {users.length === 0 && (
        <div className="text-center py-8 text-black">
          მომხმარებლები არ მოიძებნა
        </div>
      )}
    </div>
  );
}

