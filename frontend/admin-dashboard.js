const token = localStorage.getItem("admin_token");

if (!token) {
  alert("Access denied. Please login as admin.");
  window.location.href = "admin-login.html";
}

(async () => {
  try {
    const res = await fetch(`${config.API_BASE_URL}/api/admin/users`, {
      headers: {
        Authorization: `Bearer ${token}`,
      }
    });

    const data = await res.json();
    const tableBody = document.getElementById("userTableBody");

    if (res.ok && Array.isArray(data.users)) {
      data.users.forEach(user => {
        const row = document.createElement("tr");

        row.innerHTML = `
          <td>${user.full_name || "—"}</td>
          <td>${user.email}</td>
          <td>${user.status || "pending"}</td>
          <td>${new Date(user.created_at).toLocaleDateString()}</td>
          <td>
            <button class="admin-action-btn" onclick="viewUser('${user.id}')">
              View
            </button>
          </td>
        `;

        tableBody.appendChild(row);
      });
    } else {
      tableBody.innerHTML = `<tr><td colspan="5">No users found.</td></tr>`;
    }
  } catch (err) {
    console.error("Dashboard error:", err.message);
  }
})();

function viewUser(userId) {
  window.location.href = `admin-user-view.html?id=${userId}`;
}
