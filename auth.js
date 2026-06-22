/* ============================================================
 * auth.js — Helper sesi bersama (Kedai Kopi ASMDS)
 * Dipakai oleh: index.html, login.html, dashboard.html, admin.html
 *
 * "Ingat saya" → localStorage (bertahan setelah browser ditutup)
 * Tidak dicentang → sessionStorage (terhapus saat tab/browser ditutup)
 * Reader selalu cek sessionStorage dulu, baru localStorage.
 * ============================================================ */
(function (global) {
  'use strict';

  var TOKEN_KEY = 'kopi_token';
  var USER_KEY  = 'kopi_user';

  function saveSession(token, user, remember) {
    clearSession();
    var store = remember ? localStorage : sessionStorage;
    store.setItem(TOKEN_KEY, token);
    store.setItem(USER_KEY, JSON.stringify(user));
  }

  function getToken() {
    return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
  }

  function getUser() {
    var raw = sessionStorage.getItem(USER_KEY) || localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
  }

  function clearSession() {
    [localStorage, sessionStorage].forEach(function (s) {
      s.removeItem(TOKEN_KEY);
      s.removeItem(USER_KEY);
    });
  }

  function isLoggedIn() {
    return !!getToken() && !!getUser();
  }

  function authHeaders() {
    return {
      'Authorization': 'Bearer ' + getToken(),
      'Content-Type':  'application/json',
    };
  }

  global.KopiAuth = {
    saveSession: saveSession,
    getToken:    getToken,
    getUser:     getUser,
    clearSession: clearSession,
    isLoggedIn:  isLoggedIn,
    authHeaders: authHeaders,
  };
})(window);
