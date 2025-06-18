import { supabase } from "./config.js";

// Récupérer l'ID de l'événement depuis l'URL
const urlParams = new URLSearchParams(window.location.search);
const eventId = urlParams.get("id");

const eventDetails = document.querySelector("#eventDetails");
const participateButton = document.querySelector("#participateButton");
const participationMessage = document.querySelector("#participationMessage");

// Fonction pour formater la date
function formatDate(dateString) {
  const options = { day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "numeric" };
  return new Date(dateString).toLocaleDateString("fr-FR", options);
}

// Fonction pour formater les tags
function formatTags(tags) {
  if (!tags || tags.length === 0) return "";
  return `
        <div class="event-tags">
            ${tags.map((tag) => `<span class="tag">${tag}</span>`).join("")}
        </div>
    `;
}

function showMessage(message, isError = false) {
  participationMessage.textContent = message;
  participationMessage.className = isError ? "message error" : "message success";
  setTimeout(() => {
    participationMessage.textContent = "";
    participationMessage.className = "message";
  }, 5000);
}

// Fonction pour gérer la participation/désinscription
async function handleParticipation() {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError) throw userError;

    if (!user) {
      showMessage("Veuillez vous connecter pour participer", true);
      return;
    }

    // Vérifier si l'utilisateur participe déjà
    const { data: existingParticipation, error: checkError } = await supabase
      .from("participations")
      .select("*")
      .eq("event_id", eventId)
      .eq("user_id", user.id)
      .single();

    if (checkError && checkError.code !== "PGRST116") throw checkError;

    if (existingParticipation) {
      // Supprimer la participation
      const { error: deleteError } = await supabase
        .from("participations")
        .delete()
        .eq("event_id", eventId)
        .eq("user_id", user.id);

      if (deleteError) throw deleteError;

      showMessage("Vous ne participez plus à cet événement");
      participateButton.textContent = "Participer";
      participateButton.classList.remove("participating");
    } else {
      // Ajouter la participation
      const { error: insertError } = await supabase.from("participations").insert([
        {
          event_id: eventId,
          user_id: user.id,
        },
      ]);

      if (insertError) throw insertError;

      showMessage("Vous participez maintenant à cet événement !");
      participateButton.textContent = "Ne plus participer";
      participateButton.classList.add("participating");
    }

    // Après une participation ou désinscription réussie, rechargez les détails de l'événement
    await loadEventDetails();
  } catch (error) {
    console.error("Erreur lors de la gestion de la participation:", error);
    showMessage(`Erreur: ${error.message}`, true);
  }
}

// Fonction pour compter les participants
async function getParticipantsCount(eventId) {
  try {
    const { count, error } = await supabase.from("participations").select("*", { count: "exact" }).eq("event_id", eventId);

    if (error) throw error;
    return count;
  } catch (error) {
    console.error("Erreur lors du comptage des participants:", error);
    return 0;
  }
}

// Fonction pour charger les détails de l'événement
async function loadEventDetails() {
  if (!eventId) {
    eventDetails.innerHTML = '<p class="error">Aucun événement spécifié</p>';
    return;
  }

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError) throw userError;

    // Récupérer les détails de l'événement
    const { data: event, error } = await supabase.from("evenements").select("*").eq("id", eventId).single();

    if (error) throw error;

    if (!event) {
      eventDetails.innerHTML = '<p class="error">Événement non trouvé</p>';
      return;
    }

    // Récupérer le nombre de participants
    const participantsCount = await getParticipantsCount(eventId);

    // Créer le contenu HTML pour l'événement
    const eventHtml = `
            <div class="event-full-details">
                ${event.is_private ? '<span class="private-label">Privé</span>' : ""}
                <h1>${event.titre}</h1>
                <div class="event-info">
                    <p class="description">${event.description}</p>
                    <div class="details">
                        <p><strong>Date:</strong> ${formatDate(event.date)}</p>
                        <p><strong>Lieu:</strong> ${event.lieu}</p>
                        <p class="participants-count"><strong>Participants:</strong> ${participantsCount}</p>
                        ${
                          event.infos_sup?.places
                            ? `<p><strong>Places disponibles:</strong> ${event.infos_sup.places - participantsCount}</p>`
                            : ""
                        }
                    </div>
                    ${formatTags(event.tags)}
                </div>
            </div>
        `;

    eventDetails.innerHTML = eventHtml;

    // Vérifier s'il reste des places disponibles
    if (event.infos_sup?.places && participantsCount >= event.infos_sup.places) {
      participateButton.disabled = true;
      participateButton.textContent = "Événement complet";
      participateButton.classList.add("event-full");
    } else if (user) {
      participateButton.style.display = "block";
      await checkParticipation();
    } else {
      participateButton.style.display = "none";
      showMessage("Connectez-vous pour participer à cet événement", true);
    }
  } catch (error) {
    console.error("Erreur lors du chargement de l'événement:", error);
    eventDetails.innerHTML = `<p class="error">Erreur lors du chargement de l'événement: ${error.message}</p>`;
  }
}

// Fonction pour vérifier si l'utilisateur participe déjà
async function checkParticipation() {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError) throw userError;

    const { data: participation, error } = await supabase
      .from("participations")
      .select("*")
      .eq("event_id", eventId)
      .eq("user_id", user.id)
      .single();

    if (error && error.code !== "PGRST116") throw error;

    if (participation) {
      participateButton.textContent = "Ne plus participer";
      participateButton.classList.add("participating");
    } else {
      participateButton.textContent = "Participer";
      participateButton.classList.remove("participating");
    }
  } catch (error) {
    console.error("Erreur lors de la vérification de la participation:", error);
  }
}

// Écouteurs d'événements
document.addEventListener("DOMContentLoaded", loadEventDetails);
participateButton.addEventListener("click", handleParticipation);
