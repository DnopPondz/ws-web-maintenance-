"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Edit, Trash2, Eye, EyeOff } from "lucide-react";
import PageContainer from "../components/PageContainer";
import { apiClient } from "../lib/api";


const UserManagePage = () => {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState("add");
  const [selectedUser, setSelectedUser] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    firstname: "",
    lastname: "",
    role: "user",
    status: "active",
  });
  const router = useRouter();

  const normalizeRole = useCallback((role) => {
    if (typeof role !== "string") {
      return "user";
    }

    const normalized = role.trim().toLowerCase();
    return ["admin", "user"].includes(normalized) ? normalized : "user";
  }, []);

  const normalizeStatus = useCallback((status) => {
    if (typeof status !== "string") {
      return "active";
    }

    const normalized = status.trim().toLowerCase();
    if (normalized === "inactive") {
      return "suspended";
    }

    return ["active", "suspended"].includes(normalized) ? normalized : "active";
  }, []);

  const titleCase = (value = "") => {
    if (!value) {
      return "";
    }

    return value.charAt(0).toUpperCase() + value.slice(1);
  };

  const fetchUsers = useCallback(async () => {
    try {
      setError("");
      const response = await apiClient.get("/users");
      const mappedUsers = Array.isArray(response.data?.users)
        ? response.data.users.map((user) => ({
            ...user,
            role: normalizeRole(user.role),
            status: normalizeStatus(user.status),
          }))
        : [];
      setUsers(mappedUsers);
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        (err instanceof Error ? err.message : "Error fetching users");
      setError(message);
    }
  }, [normalizeRole, normalizeStatus]);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");

    if (!storedUser) {
      setHasAccess(false);
      setIsCheckingAccess(false);
      router.replace("/login");
      return;
    }

    try {
      const parsedUser = JSON.parse(storedUser);
      if (normalizeRole(parsedUser?.role) !== "admin") {
        setHasAccess(false);
        router.replace("/");
        return;
      }

      setHasAccess(true);
    } catch (parseError) {
      console.error("Unable to parse stored user:", parseError);
      setHasAccess(false);
      setIsCheckingAccess(false);
      router.replace("/login");
    } finally {
      setIsCheckingAccess(false);
    }
  }, [normalizeRole, router]);

  useEffect(() => {
    if (hasAccess) {
      fetchUsers();
    }
  }, [fetchUsers, hasAccess]);

  const openModal = (type, user = null) => {
    setModalType(type);
    setSelectedUser(user);
    if (type === "add") {
      setFormData({
        username: "",
        email: "",
        password: "",
        firstname: "",
        lastname: "",
        role: "user",
        status: "active",
      });
    } else if (type === "edit" && user) {
      setFormData({
        username: user.username,
        email: user.email,
        password: "",
        firstname: user.firstname || "",
        lastname: user.lastname || "",
        role: normalizeRole(user.role),
        status: normalizeStatus(user.status),
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedUser(null);
    setShowPassword(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (modalType === "add") {
      try {
        await apiClient.post("/register", {
          username: formData.username,
          email: formData.email,
          password: formData.password,
          firstname: formData.firstname,
          lastname: formData.lastname,
          role: formData.role,
          status: formData.status,
        });

        await fetchUsers();
        closeModal();
      } catch (err) {
        console.error("Register error:", err.response?.data || err.message);
        alert(err.response?.data?.message || "Registration failed.");
      }
    } else if (modalType === "edit") {
      try {
        if (!selectedUser) {
          return;
        }

        const payload = {
          id: selectedUser.id,
          username: formData.username,
          email: formData.email,
          firstname: formData.firstname,
          lastname: formData.lastname,
          role: formData.role,
          status: formData.status,
        };

        if (formData.password.trim() !== "") {
          payload.password = formData.password;
        }

        await apiClient.put("/edit", payload);

        await fetchUsers();
        closeModal();
      } catch (err) {
        console.error("Edit error:", err.response?.data || err.message);
        alert(err.response?.data?.message || "Update failed.");
      }
    }
  };
  const handleDelete = async () => {
    try {
      if (!selectedUser) {
        return;
      }

      await apiClient.delete(`/del/${selectedUser.id}`);

      await fetchUsers(); // โหลดข้อมูลใหม่หลังลบ
      closeModal(); // ปิด modal
    } catch (err) {
      console.error("Delete error:", err.response?.data || err.message);
      alert(err.response?.data?.message || "Delete failed.");
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  if (isCheckingAccess) {
    return (
      <PageContainer
        meta="Administration"
        title="Checking permissions"
        description="Verifying your access to the administration console."
        maxWidth="max-w-4xl"
      >
        <div className="rounded-3xl border border-slate-200 bg-white/70 p-6 text-center text-slate-700 shadow-sm">
          <p className="text-sm leading-relaxed">Loading…</p>
        </div>
      </PageContainer>
    );
  }

  if (!hasAccess) {
    return null;
  }

  if (error) {
    return (
      <PageContainer
        meta="Administration"
        title="Unable to load users"
        description="There was a problem fetching the user list."
        maxWidth="max-w-4xl"
      >
        <div className="rounded-3xl border border-red-200 bg-red-50/90 p-6 text-center text-red-700 shadow-sm">
          <p className="text-sm leading-relaxed">{error}</p>
          <button
            onClick={fetchUsers}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-red-700"
          >
            Try again
          </button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      meta="Administration"
      title="User management"
      description="Manage team access with the same refreshed interface used across the maintenance suite."
      actions={(
        <button
          onClick={() => openModal("add")}
          className="inline-flex items-center gap-2 rounded-full bg-[#316fb7] px-5 py-2 text-sm font-semibold text-white shadow transition hover:bg-[#244f8a]"
        >
          <Plus size={16} />
          Add user
        </button>
      )}
      maxWidth="max-w-6xl"
    >
      <div className="overflow-hidden rounded-3xl border border-white/60 bg-white/80 shadow">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-6 py-3">Username</th>
              <th className="px-6 py-3">Email</th>
              <th className="px-6 py-3">Role</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white/60">
            {users.map((user) => (
              <tr key={user.id} className="transition hover:bg-slate-50/80">
                <td className="px-6 py-4 font-medium text-slate-900">{user.username}</td>
                <td className="px-6 py-4 text-slate-600">{user.email}</td>
                <td className="px-6 py-4 text-slate-600">{titleCase(user.role)}</td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${
                      user.status === "active"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {titleCase(user.status)}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm">
                  <div className="flex gap-2">
                    <button
                      onClick={() => openModal("edit", user)}
                      className="inline-flex items-center justify-center rounded-full bg-[#316fb7]/10 p-2 text-[#316fb7] transition hover:bg-[#316fb7]/20"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => openModal("delete", user)}
                      className="inline-flex items-center justify-center rounded-full bg-red-500/10 p-2 text-red-600 transition hover:bg-red-500/20"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/30 backdrop-blur-sm z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold mb-6 text-gray-800">
              {modalType === "add" && "Add New User"}
              {modalType === "edit" && "Edit User"}
              {modalType === "delete" && "Delete User"}
            </h2>

            {modalType === "delete" ? (
              <div>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to delete user "{selectedUser?.username}
                  "?
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transform hover:scale-105 cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Firstname
                  </label>
                  <input
                    type="text"
                    name="firstname"
                    value={formData.firstname}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lastname
                  </label>
                  <input
                    type="text"
                    name="lastname"
                    value={formData.lastname}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {modalType === "edit"
                      ? "New Password (leave blank to keep current)"
                      : "Password"}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg pr-10 focus:ring-2 focus:ring-blue-500"
                      required={modalType === "add"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role
                  </label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transform hover:scale-105 cursor-pointer"
                  >
                    {modalType === "add" ? "Add User" : "Save Changes"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </PageContainer>
  );
};

export default UserManagePage;
