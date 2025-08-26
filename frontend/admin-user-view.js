
const token = localStorage.getItem("admin_token");
const userId = new URLSearchParams(window.location.search).get("id");

const userInfoContainer = document.getElementById("userInfo");
const adminMessageInput = document.getElementById("adminMessage");
const approveBtn = document.getElementById("approveBtn");
const disapproveBtn = document.getElementById("disapproveBtn");
const statusText = document.getElementById("updateStatusText");

if (!token) {
  alert("Access denied. Please login.");
  window.location.href = "admin-login.html";
}

async function loadUser() {
  try {
    const res = await fetch(`${config.API_BASE_URL}/api/admin/users/${userId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!res.ok) {
      if (res.status === 401) {
        alert("Session expired. Please login again.");
        window.location.href = "admin-login.html";
        return;
      }
      userInfoContainer.innerHTML = `❌ Error: ${res.status} - ${res.statusText}`;
      return;
    }

    const data = await res.json();

    if (!data.success || !data.user) {
      userInfoContainer.innerHTML = `❌ ${data.message || "User not found"}`;
      return;
    }

    const user = data.user;

    userInfoContainer.innerHTML = `
      <h3>${user.full_name || "Unnamed User"}</h3>
      <p><strong>Email:</strong> ${user.email}</p>
      <p><strong>Status:</strong> ${user.status || "pending"}</p>
      <p><strong>User ID:</strong> ${user.id}</p>
      <p><strong>National ID Number:</strong> ${user.national_id_number || "—"}</p>

      <h4>ID Front</h4>
      ${user.id_front_url ? `<img src="${user.id_front_url}" alt="ID Front" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
      <p style="display:none; color:red;">Image failed to load</p>` : '<p>No ID front image</p>'}

      <h4>ID Back</h4>
      ${user.id_back_url ? `<img src="${user.id_back_url}" alt="ID Back" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
      <p style="display:none; color:red;">Image failed to load</p>` : '<p>No ID back image</p>'}

      <h4>Liveness Video</h4>
      ${user.liveness_video_url ? `<video src="${user.liveness_video_url}" controls onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"></video>
      <p style="display:none; color:red;">Video failed to load</p>` : '<p>No liveness video</p>'}

      <h4>Profile Photo</h4>
      ${user.profile_photo_url ? `<img src="${user.profile_photo_url}" alt="Profile Photo" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
      <p style="display:none; color:red;">Image failed to load</p>` : '<p>No profile photo</p>'}
    `;
  } catch (err) {
    userInfoContainer.innerHTML = "⚠️ Error loading user.";
    console.error(err);
  }
}

async function updateStatus(newStatus) {
  try {
    const message = adminMessageInput.value.trim();
    if (!message) {
      alert("❌ Please enter a message to send to the user.");
      return;
    }

    const res = await fetch(`${config.API_BASE_URL}/api/admin/user/status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        userId: userId,
        status: newStatus,
        adminMessage: message
      })
    });

    const data = await res.json();

    if (res.ok) {
      statusText.textContent = `✅ User marked as ${newStatus}. Email sent with login link.`;
    } else {
      statusText.textContent = `❌ Error: ${data.message}`;
    }
  } catch (err) {
    statusText.textContent = "❌ Server error";
    console.error(err);
  }
}

async function triggerReset(endpoint) {
  try {
    const res = await fetch(`${config.API_BASE_URL}/api/user/${endpoint}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      alert("❌ Reset failed: " + (data.message || "Unknown error"));
    } else {
      console.log(`✅ ${endpoint} triggered successfully`);
    }
  } catch (err) {
    console.error(`❌ Error triggering ${endpoint}:`, err);
  }
}

approveBtn.addEventListener("click", () => updateStatus("approved"));

disapproveBtn.addEventListener("click", async () => {
  await updateStatus("disapproved");
  await triggerReset("reset-submission");
});

loadUser();
