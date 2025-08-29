const config = {
  API_BASE_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? "http://localhost:5000"
    : `${window.location.protocol}//${window.location.host}`
};