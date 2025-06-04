"use client";
import { useEffect, useState } from "react";
import { Plus, Edit, Trash2, Eye, EyeOff } from "lucide-react";
import axios from "../lib/api.js";

const UserManagePage = () => {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState("add"); // add, edit, delete
  const [selectedUser, setSelectedUser] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    role: "User",
    status: "Active",
  });

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        const response = await axios.get("/users", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setUsers(response.data.users);
      } catch (err) {
        setError(err.response?.data?.message || "Error fetching users");
      }
    };

    fetchUsers();
  }, []);

  if (error) return <p>Error: {error}</p>;

  const openModal = (type, user = null) => {
    setModalType(type);
    setSelectedUser(user);
    if (type === "add") {
      setFormData({
        username: "",
        email: "",
        password: "",
        role: "User",
        status: "Active",
      });
    } else if (type === "edit" && user) {
      setFormData({
        username: user.username,
        email: user.email,
        password: "",
        role: user.role,
        status: user.status,
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedUser(null);
    setShowPassword(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (modalType === "add") {
      const newUser = {
        id: Math.max(...users.map((u) => u.id)) + 1,
        ...formData,
      };
      setUsers([...users, newUser]);
    } else if (modalType === "edit") {
      setUsers(
        users.map((user) =>
          user.id === selectedUser.id
            ? {
                ...user,
                ...formData,
                password: formData.password || user.password,
              }
            : user
        )
      );
    }
    closeModal();
  };

  const handleDelete = () => {
    setUsers(users.filter((user) => user.id !== selectedUser.id));
    closeModal();
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-full bg-gray-100 p-6 relative ">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">User Management</h1>
          <button
            onClick={() => openModal("add")}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors duration-200"
          >
            <Plus size={16} />
            Add User
          </button>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Username
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="hover:bg-gray-50 transition-colors duration-150"
                >
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {user.username}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {user.role}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.status === "Active"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openModal("edit", user)}
                        className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition-all duration-200"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => openModal("delete", user)}
                        className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition-all duration-200"
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
        <div
          className={`absolute inset-0 bg-white bg-opacity-40 backdrop-blur-sm flex items-center justify-center z-50 transition-all duration-300 ${
            showModal ? "opacity-100" : "opacity-0"
          }`}
        >
          <div
            className={`bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4 transform transition-all duration-300 ${
              showModal
                ? "scale-100 translate-y-0 opacity-100"
                : "scale-95 translate-y-4 opacity-0"
            }`}
          >
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
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transform hover:scale-105 transition-all duration-200"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
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
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
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
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10 transition-all duration-200"
                      required={modalType === "add"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 transition-colors duration-200"
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
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  >
                    <option value="User">User</option>
                    <option value="Admin">Admin</option>
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
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      handleSubmit(e);
                    }}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transform hover:scale-105 transition-all duration-200"
                  >
                    {modalType === "add" ? "Add User" : "Save Changes"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagePage;
