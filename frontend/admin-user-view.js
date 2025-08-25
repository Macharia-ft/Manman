
const token = localStorage.getItem("admin_token");
const userId = new URLSearchParams(window.location.search).get("id");

const userInfoContainer = document.getElementById("userInfo");
const adminMessageInput = document.getElementById("adminMessage");
const approveBtn = document.getElementById("approveBtn");
const disapproveAllBtn = document.getElementById("disapproveAllBtn");
const disapproveIdentityBtn = document.getElementById("disapproveIdentityBtn");
const disapprovePersonalBtn = document.getElementById("disapprovePersonalBtn");
const statusText = document.getElementById("updateStatusText");

if (!token) {
  alert("Access denied. Please login.");
  window.location.href = "admin-login.html";
}

async function loadUser() {
  try {
    const res = await fetch(`${config.API_BASE_URL}/api/admin/user/${userId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json();

    if (!res.ok || !data.user) {
      userInfoContainer.innerHTML = "❌ User not found";
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
      <img src="${user.id_front_url}" alt="ID Front" />

      <h4>ID Back</h4>
      <img src="${user.id_back_url}" alt="ID Back" />

      <h4>Liveness Video</h4>
      <video src="${user.liveness_video_url}" controls></video>

      <h4>Profile Photo</h4>
      <img src="${user.profile_photo_url}" alt="Profile Photo" />
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

    const res = await fetch(`${config.API_BASE_URL}/api/admin/user/${userId}/status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        status: newStatus,
        admin_message: message
      })
    });

    const data = await res.json();

    if (res.ok) {
      statusText.textContent = `✅ User marked as ${newStatus}`;
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

disapproveAllBtn.addEventListener("click", async () => {
  await updateStatus("disapproved");
  await triggerReset("reset-submission");
});

disapproveIdentityBtn.addEventListener("click", async () => {
  await updateStatus("disapproved");
  await triggerReset("reset-identity");
});

disapprovePersonalBtn.addEventListener("click", async () => {
  await updateStatus("disapproved");
  await triggerReset("reset-personal");
});

loadUser();
