
import axios from 'axios';

const API = 'http://localhost:5000/api';

export async function loginUser({ username, password }) {
  const res = await axios.post(`${API}/login`, {
    username,
    password,
  });
  return res.data; // 👉 ได้ accessToken, refreshToken, user
}


export async function logoutUser(refreshToken) {
  const accessToken = localStorage.getItem('accessToken');

  return axios.post(`${API}/logout`, { refreshToken }, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
}