import { supabase } from "./config.js";

async function checkSession() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  if (session) {
    window.location.href = "index.html";
  }
}

checkSession();

let loginForm = document.querySelector("#loginForm");
let loginMessage = document.querySelector("#loginMessage");
let signupForm = document.querySelector("#signupForm");
let signupMessage = document.querySelector("#signupMessage");

function displayMessage(element, message, isError = false) {
  element.textContent = message;
  element.className = isError ? "message error" : "message success";
  setTimeout(() => {
    element.textContent = "";
    element.className = "message";
  }, 5000);
}

// Gestion de la connexion
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  let email = document.querySelector("#loginEmail").value;
  let password = document.querySelector("#loginPassword").value;

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      let errorMessage;
      switch (error.message) {
        case "Invalid login credentials":
          errorMessage = "Email ou mot de passe incorrect";
          break;
        case "Email not confirmed":
          errorMessage = "Veuillez confirmer votre email avant de vous connecter";
          break;
        default:
          errorMessage = `Erreur de connexion : ${error.message}`;
      }
      displayMessage(loginMessage, errorMessage, true);
      return;
    }

    displayMessage(loginMessage, "Connexion réussie !");
    loginForm.reset();
    setTimeout(() => {
      window.location.href = "index.html";
    }, 1000);
  } catch (error) {
    displayMessage(loginMessage, `Une erreur est survenue : ${error.message}`, true);
  }
});

//Gestion de l'inscription
signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  let name = document.querySelector("#signupName").value;
  let email = document.querySelector("#signupEmail").value;
  let password = document.querySelector("#signupPassword").value;

  try {
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          name: name,
        },
      },
    });

    if (error) {
      displayMessage(signupMessage, `Erreur lors de l'inscription : ${error.message}`, true);
      return;
    }

    displayMessage(signupMessage, "Inscription réussie ! Veuillez vérifier votre email pour confirmer votre compte.");
    signupForm.reset();
  } catch (error) {
    displayMessage(signupMessage, `Une erreur est survenue : ${error.message}`, true);
  }
});
