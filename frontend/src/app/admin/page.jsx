"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Edit, Trash2, Eye, EyeOff, X, ChevronDown } from "lucide-react";
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
        className="lg:ml-4"
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
        className="lg:ml-4"
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
      className="lg:ml-4"
    >
      <div className="rounded-3xl border border-white/60 bg-white/80 shadow">
        <div className="w-full overflow-x-auto rounded-3xl">
          <table className="min-w-[720px] divide-y divide-slate-200 text-left text-sm md:min-w-full">
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
                  <td className="whitespace-nowrap px-6 py-4 font-medium text-slate-900">{user.username}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-slate-600">{user.email}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-slate-600">{titleCase(user.role)}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
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
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm sm:p-6">
          <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {modalType === "add" && "Add new user"}
                  {modalType === "edit" && "Edit user"}
                  {modalType === "delete" && "Delete user"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {modalType === "add" && "Create a new account and assign the appropriate role and status."}
                  {modalType === "edit" && "Update account details, set a new password, or adjust access."}
                  {modalType === "delete" && "Removing a user immediately revokes their access to the system."}
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="-m-2 rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#316fb7]"
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[calc(100vh-8rem)] overflow-y-auto px-6 pb-6 pt-4">
              {modalType === "delete" ? (
                <div className="space-y-6">
                  <p className="text-sm leading-relaxed text-slate-600">
                    Are you sure you want to delete user "{selectedUser?.username}"? This action cannot be undone.
                  </p>
                  <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button
                      onClick={closeModal}
                      className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#316fb7]"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDelete}
                      className="inline-flex items-center justify-center rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                    >
                      Delete user
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-600">Firstname</label>
                      <input
                        type="text"
                        name="firstname"
                        value={formData.firstname}
                        onChange={handleInputChange}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 shadow-sm transition focus:border-[#316fb7] focus:outline-none focus:ring-2 focus:ring-[#316fb7]/40"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-600">Lastname</label>
                      <input
                        type="text"
                        name="lastname"
                        value={formData.lastname}
                        onChange={handleInputChange}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 shadow-sm transition focus:border-[#316fb7] focus:outline-none focus:ring-2 focus:ring-[#316fb7]/40"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-600">Username</label>
                      <input
                        type="text"
                        name="username"
                        value={formData.username}
                        onChange={handleInputChange}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 shadow-sm transition focus:border-[#316fb7] focus:outline-none focus:ring-2 focus:ring-[#316fb7]/40"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-600">Email</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 shadow-sm transition focus:border-[#316fb7] focus:outline-none focus:ring-2 focus:ring-[#316fb7]/40"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-600">
                        {modalType === "edit"
                          ? "New password (leave blank to keep current)"
                          : "Password"}
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          name="password"
                          value={formData.password}
                          onChange={handleInputChange}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2.5 pr-10 text-sm text-slate-700 shadow-sm transition focus:border-[#316fb7] focus:outline-none focus:ring-2 focus:ring-[#316fb7]/40"
                          required={modalType === "add"}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 transition hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#316fb7]"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-600">Role</label>
                      <div className="relative">
                        <select
                          name="role"
                          value={formData.role}
                          onChange={handleInputChange}
                          className="peer w-full appearance-none rounded-lg border border-slate-200 bg-gradient-to-b from-white to-slate-50 px-3 py-2.5 pr-10 text-sm font-medium text-slate-700 shadow-sm transition focus:border-[#316fb7] focus:outline-none focus:ring-2 focus:ring-[#316fb7]/40 hover:border-slate-300"
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                        <ChevronDown
                          size={16}
                          className="pointer-events-none absolute inset-y-0 right-3 my-auto text-slate-400 transition peer-focus:text-[#316fb7]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-600">Status</label>
                      <div className="relative">
                        <select
                          name="status"
                          value={formData.status}
                          onChange={handleInputChange}
                          className="peer w-full appearance-none rounded-lg border border-slate-200 bg-gradient-to-b from-white to-slate-50 px-3 py-2.5 pr-10 text-sm font-medium text-slate-700 shadow-sm transition focus:border-[#316fb7] focus:outline-none focus:ring-2 focus:ring-[#316fb7]/40 hover:border-slate-300"
                        >
                          <option value="active">Active</option>
                          <option value="suspended">Suspended</option>
                        </select>
                        <ChevronDown
                          size={16}
                          className="pointer-events-none absolute inset-y-0 right-3 my-auto text-slate-400 transition peer-focus:text-[#316fb7]"
                        />
                      </div>
                    </div>
                    <div className="hidden sm:block" />
                  </div>

                  <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#316fb7]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center rounded-lg bg-[#316fb7] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#244f8a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#316fb7]/50"
                    >
                      {modalType === "add" ? "Create user" : "Save changes"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
};

export default UserManagePage;
