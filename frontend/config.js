const config = {
  // Local development
  LOCAL_API_BASE_URL: "http://localhost:5000",

  // GitHub Codespaces
  CODESPACE_API_BASE_URL: "https://potential-waffle-x5qqr9p67jwwcx4v-5000.app.github.dev",

  // Render deployment
  RENDER_API_BASE_URL: "https://takeyours.onrender.com",

  // ✅ Dynamically select API base URL depending on where app is running
  get API_BASE_URL() {
    if (window.location.hostname.includes("github.dev")) {
      return this.CODESPACE_API_BASE_URL;
    } else if (window.location.hostname.includes("onrender.com")) {
      return this.RENDER_API_BASE_URL;
    } else {
      return this.LOCAL_API_BASE_URL;
    }
  }
};
