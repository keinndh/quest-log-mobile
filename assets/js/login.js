import { cloudSync } from './firebase.js';

$(document).ready(function() {
    // LOGIN
    $("#login-form").on("submit", async function(e) {
        e.preventDefault();
        const email = $("#login-email").val();
        const password = $("#login-password").val();
        const btn = $(this).find("button");
        const originalText = btn.text();

        btn.text("AUTHENTICATING...").prop("disabled", true);
        $("#auth-message").hide();

        try {
            const res = await cloudSync.login(email, password);
            if (res.status === 'success') {
                localStorage.setItem('ql_user_id', res.userId);
                window.location.href = 'dashboard.html';
            } else {
                showError(res.message);
                btn.text(originalText).prop("disabled", false);
            }
        } catch (err) {
            showError(err.message || "Connection failed. Check your internet.");
            btn.text(originalText).prop("disabled", false);
        }
    });

    // REGISTER
    $("#register-form").on("submit", async function(e) {
        e.preventDefault();
        const email = $("#reg-email").val();
        const password = $("#reg-password").val();
        const confirm = $("#reg-confirm").val();
        const btn = $(this).find("button");
        const originalText = btn.text();

        if (password !== confirm) {
            showError("Passwords do not match!");
            return;
        }

        btn.text("CREATING HERO...").prop("disabled", true);
        $("#auth-message").hide();

        try {
            const res = await cloudSync.register(email, password);
            if (res.status === 'success') {
                alert("🛡️ Hero Registered! A verification email has been sent to " + email + ". Please verify before signing in.");
                location.reload(); 
            } else {
                showError(res.message);
                btn.text(originalText).prop("disabled", false);
            }
        } catch (err) {
            showError(err.message || "Registration failed. Check your internet.");
            btn.text(originalText).prop("disabled", false);
        }
    });

    function showError(msg) {
        $("#auth-message").text("⚠️ " + msg).fadeIn();
    }

    async function forgotPassword() {
        const email = $("#login-email").val();
        if (!email) {
            showError("Enter your email address first, Hero!");
            return;
        }

        if (confirm(`⚔️ Send a recovery scroll to ${email}?`)) {
            const res = await cloudSync.resetPassword(email);
            if (res.status === 'success') {
                alert("📜 " + res.message);
            } else {
                showError(res.message);
            }
        }
    }
    window.forgotPassword = forgotPassword;
});
