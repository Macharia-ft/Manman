const form = document.getElementById("adminLoginForm");
const errorText = document.getElementById("adminLoginError");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorText.style.display = "none";

  const formData = new FormData(form);
  const email = formData.get("email");
  const password = formData.get("password");

  try {
    const res = await fetch(`${config.API_BASE_URL}/api/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const result = await res.json();

    if (res.ok && result.token) {
      localStorage.setItem("admin_token", result.token);
      window.location.href = "admin-dashboard.html"; // ✅ next page
    } else {
      errorText.textContent = result.message || "Login failed";
      errorText.style.display = "block";
    }
  } catch (err) {
    errorText.textContent = "Server error. Try again.";
    errorText.style.display = "block";
    console.error(err);
  }
});
