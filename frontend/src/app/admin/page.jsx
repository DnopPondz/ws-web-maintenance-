"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Edit, Trash2, Eye, EyeOff } from "lucide-react";
import PageContainer from "../components/PageContainer";
import {
  createUserAccount,
  deleteUserAccount,
  fetchAllUsers,
  updateUserAccount,
} from "../lib/api";

const ROLE_OPTIONS = [
  { value: "user", label: "User" },
  { value: "admin", label: "Admin" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
];

const STATUS_STYLES = {
  active: "bg-emerald-100 text-emerald-700",
  suspended: "bg-red-100 text-red-700",
  inactive: "bg-red-100 text-red-700",
};

const DEFAULT_FORM_STATE = {
  username: "",
  email: "",
  password: "",
  firstname: "",
  lastname: "",
  role: "user",
  status: "active",
};

const buildEmptyFormState = () => ({ ...DEFAULT_FORM_STATE });

const normalizeUser = (user) => ({
  ...user,
  role: typeof user.role === "string" ? user.role.toLowerCase() : "user",
  status: typeof user.status === "string" ? user.status.toLowerCase() : "active",
});

const formatStatusLabel = (status) => {
  if (!status) {
    return "Unknown";
  }

  const option = STATUS_OPTIONS.find((item) => item.value === status);
  if (option) {
    return option.label;
  }

  return status.charAt(0).toUpperCase() + status.slice(1);
};

const UserManagePage = () => {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState("add");
  const [selectedUser, setSelectedUser] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState(() => buildEmptyFormState());
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const data = await fetchAllUsers();
      const normalizedUsers = Array.isArray(data)
        ? data.map((user) => normalizeUser(user))
        : [];
      setUsers(normalizedUsers);
    } catch (err) {
      console.error("Fetch users error:", err);
      setError(err.message || "Unable to load users.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isActive = true;

    const verifyAccess = () => {
      try {
        const storedUser = localStorage.getItem("user");

        if (!storedUser) {
          router.replace("/login");
          return;
        }

        const parsedUser = JSON.parse(storedUser);
        const role = parsedUser?.role?.toLowerCase();

        if (role === "admin") {
          if (isActive) {
            setHasAccess(true);
          }
        } else {
          router.replace("/dashboard");
        }
      } catch (err) {
        console.error("Access verification error:", err);
        router.replace("/login");
      } finally {
        if (isActive) {
          setIsCheckingAccess(false);
        }
      }
    };

    verifyAccess();

    return () => {
      isActive = false;
    };
  }, [router]);

  useEffect(() => {
    if (!hasAccess) {
      return;
    }

    loadUsers();
  }, [hasAccess, loadUsers]);

  const openModal = (type, user = null) => {
    setModalType(type);
    setSelectedUser(user ? normalizeUser(user) : null);

    if (type === "add") {
      setFormData(buildEmptyFormState());
    } else if (type === "edit" && user) {
      const normalizedUser = normalizeUser(user);
      setFormData({
        username: normalizedUser.username || "",
        email: normalizedUser.email || "",
        password: "",
        firstname: normalizedUser.firstname || "",
        lastname: normalizedUser.lastname || "",
        role: normalizedUser.role || "user",
        status: normalizedUser.status || "active",
      });
    }

    setShowPassword(false);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedUser(null);
    setShowPassword(false);
    setFormData(buildEmptyFormState());
    setIsProcessing(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (modalType === "delete") {
      return;
    }

    setIsProcessing(true);

    try {
      if (modalType === "add") {
        await createUserAccount({
          username: formData.username.trim(),
          email: formData.email.trim(),
          password: formData.password,
          firstname: formData.firstname.trim(),
          lastname: formData.lastname.trim(),
          role: formData.role,
        });
      } else if (modalType === "edit" && selectedUser) {
        const payload = {
          id: selectedUser.id,
          username: formData.username.trim(),
          email: formData.email.trim(),
          firstname: formData.firstname.trim(),
          lastname: formData.lastname.trim(),
          role: formData.role,
          status: formData.status,
        };

        if (formData.password.trim()) {
          payload.password = formData.password;
        }

        await updateUserAccount(payload);
      }

      await loadUsers();
      closeModal();
    } catch (err) {
      console.error("Submit error:", err);
      alert(err.message || "Unable to save the user.");
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) {
      return;
    }

    setIsProcessing(true);

    try {
      await deleteUserAccount(selectedUser.id);
      await loadUsers();
      closeModal();
    } catch (err) {
      console.error("Delete error:", err);
      alert(err.message || "Unable to delete the user.");
      setIsProcessing(false);
    }
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  if (isCheckingAccess) {
    return (
      <PageContainer
        meta="Administration"
        title="Checking permissions"
        description="Ensuring you have access to the administration console."
        maxWidth="max-w-3xl"
      >
        <div className="rounded-3xl border border-slate-200 bg-white/70 p-6 text-center text-slate-600 shadow-sm">
          <p className="text-sm">Loading…</p>
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
            onClick={loadUsers}
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
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                  Loading users…
                </td>
              </tr>
            ) : users.length > 0 ? (
              users.map((user) => {
                const normalizedStatus = user.status || "active";
                const badgeStyles =
                  STATUS_STYLES[normalizedStatus] || "bg-slate-100 text-slate-600";

                return (
                  <tr key={user.id} className="transition hover:bg-slate-50/80">
                    <td className="px-6 py-4 font-medium text-slate-900">{user.username}</td>
                    <td className="px-6 py-4 text-slate-600">{user.email}</td>
                    <td className="px-6 py-4 text-slate-600">
                      {user.role === "admin" ? "Admin" : "User"}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${badgeStyles}`}
                      >
                        {formatStatusLabel(normalizedStatus)}
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
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <h2 className="mb-6 text-lg font-semibold text-gray-800">
              {modalType === "add" && "Add New User"}
              {modalType === "edit" && "Edit User"}
              {modalType === "delete" && "Delete User"}
            </h2>

            {modalType === "delete" ? (
              <div>
                <p className="mb-6 text-gray-600">
                  Are you sure you want to delete user "{selectedUser?.username}"?
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={closeModal}
                    className="cursor-pointer rounded-lg border border-gray-300 px-4 py-2 text-gray-600 hover:bg-gray-50"
                    disabled={isProcessing}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    className="cursor-pointer rounded-lg bg-red-500 px-4 py-2 text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isProcessing}
                  >
                    {isProcessing ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    First name
                  </label>
                  <input
                    type="text"
                    name="firstname"
                    value={formData.firstname}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Last name
                  </label>
                  <input
                    type="text"
                    name="lastname"
                    value={formData.lastname}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Username
                  </label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    {modalType === "edit"
                      ? "New password (optional)"
                      : "Password"}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required={modalType === "add"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-3 text-gray-400 transition hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Role
                  </label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {ROLE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Status
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="cursor-pointer rounded-lg border border-gray-300 px-4 py-2 text-gray-600 hover:bg-gray-50"
                    disabled={isProcessing}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="cursor-pointer rounded-lg bg-blue-500 px-4 py-2 text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isProcessing}
                  >
                    {isProcessing ? "Saving..." : modalType === "add" ? "Add User" : "Save Changes"}
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
