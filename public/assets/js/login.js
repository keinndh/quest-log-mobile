$(document).ready(function() {
    // REDIRECT IF ALREADY LOGGED IN
    if (localStorage.getItem('ql_user_id') && (window.location.search.includes('page=login') || window.location.search === '')) {
        window.location.href = '?page=dashboard';
        return;
    }

    // LOGIN
    $("#login-form").on("submit", function(e) {
        e.preventDefault();
        const username = $("#login-email").val(); // Field id is login-email but we use it as username
        const password = $("#login-password").val();
        const btn = $(this).find("button");
        const originalText = btn.text();

        btn.text("AUTHENTICATING...").prop("disabled", true);
        $("#auth-message").hide();

        $.post('app/controller.php', {
            action: 'login',
            username: username,
            password: password
        }, function(res) {
            if (res.status === 'success') {
                // Save user info for "remember me" logic
                localStorage.setItem('ql_user_id', username); // Using username as ID for PHP version
                window.location.href = '?page=dashboard';
            } else {
                showError(res.message);
                btn.text(originalText).prop("disabled", false);
            }
        }, 'json').fail(function() {
            showError("Connection failed. Server might be offline.");
            btn.text(originalText).prop("disabled", false);
        });
    });

    // REGISTER
    $("#register-form").on("submit", function(e) {
        e.preventDefault();
        const username = $("#reg-email").val();
        const password = $("#reg-password").val();
        const confirm = $("#reg-confirm").val();
        const btn = $(this).find("button");
        const originalText = btn.text();

        if (password !== confirm) {
            showError("Passwords do not match!");
            return;
        }

        if (password.length < 8) {
            showError("Password must be at least 8 characters!");
            return;
        }

        btn.text("CREATING HERO...").prop("disabled", true);
        $("#auth-message").hide();

        $.post('app/controller.php', {
            action: 'register',
            username: username,
            password: password
        }, function(res) {
            if (res.status === 'success') {
                alert("🛡️ Hero Registered! You may now sign in.");
                location.reload(); 
            } else {
                showError(res.message);
                btn.text(originalText).prop("disabled", false);
            }
        }, 'json').fail(function() {
            showError("Registration failed. Server error.");
            btn.text(originalText).prop("disabled", false);
        });
    });

    function showError(msg) {
        $("#auth-message").text("⚠️ " + msg).fadeIn();
    }

    function forgotPassword() {
        alert("📜 Recovery scrolls are currently disabled in this Kingdom. Please contact the High Mage (Admin).");
    }
    window.forgotPassword = forgotPassword;
});
