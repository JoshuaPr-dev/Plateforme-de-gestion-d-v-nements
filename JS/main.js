import { supabase } from "./config.js";


async function checkSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = "login.html";
    }
}
checkSession();

async function logout() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error("Erreur lors de la déconnexion:", error.message);
        } else {
            window.location.href = "login.html";
        }
    } catch (error) {
        console.error("Erreur lors de la déconnexion:", error.message);
    }
}

let logoutButton = document.querySelector("#logoutButton");
if (logoutButton) {
    logoutButton.addEventListener("click", logout);
}
