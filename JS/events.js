import { supabase } from "./config.js";

let eventsList = document.querySelector("#eventsList");
let createEventForm = document.querySelector("#createEventForm");
let createEventMessage = document.querySelector("#createEventMessage");

function formatDate(dateString) {
  let options = { day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "numeric" };
  return new Date(dateString).toLocaleDateString("fr-FR", options);
}

function formatTags(tags) {
  if (!tags || tags.length === 0) return "";
  return `
        <div class="event-tags">
            ${tags.map((tag) => `<span class="tag">${tag}</span>`).join("")}
        </div>
    `;
}

// Ajoutez cette fonction pour vérifier le statut de participation pour un événement
async function getParticipationStatus(eventId) {
    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) return false;

        const { data, error } = await supabase
            .from('participations')
            .select('*')
            .eq('event_id', eventId)
            .eq('user_id', user.id)
            .single();

        return !error && data;
    } catch {
        return false;
    }
}

// Ajoutez cette fonction pour compter les participants d'un événement
async function getParticipantsCount(eventId) {
    try {
        const { count, error } = await supabase
            .from('participations')
            .select('*', { count: 'exact' })
            .eq('event_id', eventId);

        if (error) throw error;
        return count || 0;
    } catch (error) {
        console.error('Erreur lors du comptage des participants:', error);
        return 0;
    }
}

// Modifiez la fonction createEventCard
async function createEventCard(event) {
    const eventCard = document.createElement("div");
    eventCard.className = "event-card";
    const privateLabel = event.is_private ? '<span class="private-label">Privé</span>' : "";
    
    // Vérifier le statut de participation et le nombre de participants
    const [isParticipating, participantsCount] = await Promise.all([
        getParticipationStatus(event.id),
        getParticipantsCount(event.id)
    ]);
    
    let infosSupHtml = "";
    if (event.infos_sup) {
        const infos = Object.entries(event.infos_sup);
        if (infos.length > 0) {
            infosSupHtml = `
                <div class="additional-info">
                    ${infos.map(([key, value]) => `<p><strong>${key}:</strong> ${value}</p>`).join("")}
                </div>
            `;
        }
    }

    // Calculer les places restantes
    const placesDisponibles = event.infos_sup?.places ? event.infos_sup.places - participantsCount : null;
    const placesHtml = placesDisponibles !== null ? 
        `<p class="places-info">Places restantes : ${placesDisponibles}/${event.infos_sup.places}</p>` : '';

    eventCard.innerHTML = `
        ${privateLabel}
        <h3>${event.titre}</h3>
        <p class="event-description">${event.description}</p>
        <div class="event-details">
            <p><strong>Date:</strong> ${formatDate(event.date)}</p>
            <p><strong>Lieu:</strong> ${event.lieu}</p>
            ${formatTags(event.tags)}
            ${infosSupHtml}
        </div>
        <div class="event-stats">
            <p class="participants-count">
                <strong>Participants:</strong> ${participantsCount}
                ${placesHtml}
            </p>
        </div>
        <div class="participation-status">
            ${placesDisponibles === 0 && !isParticipating ? 
                '<button class="participate-btn event-full" disabled>Événement complet</button>' :
                `<button class="participate-btn ${isParticipating ? 'participating' : ''}" data-event-id="${event.id}">
                    ${isParticipating ? 'Ne plus participer' : 'Participer'}
                </button>`
            }
            <a href="event.html?id=${event.id}" class="details-btn">Voir les détails</a>
        </div>
    `;

    const participateBtn = eventCard.querySelector('.participate-btn:not([disabled])');
    if (participateBtn) {
        participateBtn.addEventListener('click', () => handleParticipation(event.id));
    }

    return eventCard;
}

function showParticipationMessage(message, isError = false) {
    const messageContainer = document.querySelector("#participationMessage");
    if (!messageContainer) return;

    messageContainer.textContent = message;
    messageContainer.className = `message ${isError ? 'error' : 'success'}`;
    
    // Faire défiler jusqu'au message
    messageContainer.scrollIntoView({ behavior: 'smooth' });

    // Effacer le message après 5 secondes
    setTimeout(() => {
        messageContainer.textContent = "";
        messageContainer.className = "message";
    }, 5000);
}

// Ajoutez cette nouvelle fonction dans events.js pour gérer la participation :
async function handleParticipation(eventId) {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;

    if (!user) {
      showParticipationMessage("Veuillez vous connecter pour participer", true);
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

    // Récupérer l'événement pour avoir les infos sur les places
    const { data: event } = await supabase
      .from("evenements")
      .select("*")
      .eq("id", eventId)
      .single();

    if (existingParticipation) {
      // Supprimer la participation
      const { error: deleteError } = await supabase
        .from("participations")
        .delete()
        .eq("event_id", eventId)
        .eq("user_id", user.id);

      if (deleteError) throw deleteError;

      const btn = document.querySelector(`button[data-event-id="${eventId}"]`);
      btn.textContent = "Participer";
      btn.classList.remove("participating");
      showParticipationMessage("Vous ne participez plus à cet événement");
    } else {
      // Ajouter la participation
      const { error: insertError } = await supabase.from("participations").insert([
        {
          event_id: eventId,
          user_id: user.id
        }
      ]);

      if (insertError) throw insertError;

      const btn = document.querySelector(`button[data-event-id="${eventId}"]`);
      btn.textContent = "Ne plus participer";
      btn.classList.add("participating");
      showParticipationMessage("Vous participez maintenant à cet événement !");
    }

    // Mettre à jour le nombre de participants
    const newParticipantsCount = await getParticipantsCount(eventId);
    const statsContainer = document.querySelector(`button[data-event-id="${eventId}"]`).closest('.event-card').querySelector('.event-stats');
    
    const placesDisponibles = event.infos_sup?.places ? event.infos_sup.places - newParticipantsCount : null;
    const placesHtml = placesDisponibles !== null ? 
        `<p class="places-info">Places restantes : ${placesDisponibles}/${event.infos_sup.places}</p>` : '';

    statsContainer.innerHTML = `
        <p class="participants-count">
            <strong>Participants:</strong> ${newParticipantsCount}
            ${placesHtml}
        </p>
    `;

    // Si l'événement est complet, désactiver le bouton
    if (placesDisponibles === 0 && !existingParticipation) {
        const btn = document.querySelector(`button[data-event-id="${eventId}"]`);
        btn.disabled = true;
        btn.textContent = "Événement complet";
        btn.classList.add("event-full");
    }

  } catch (error) {
    console.error("Erreur lors de la gestion de la participation:", error);
    showParticipationMessage(`Erreur: ${error.message}`, true);
  }
}

async function loadEvents() {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError) throw userError;
    const { data: events, error } = await supabase
      .from("evenements")
      .select("*")
      .or(`is_private.eq.false,user_id.eq.${user.id}`)
      .order("date", { ascending: true });
    if (error) {
      throw error;
    }
    eventsList.innerHTML = "";
    if (events.length === 0) {
      eventsList.innerHTML = "<p>Aucun événement disponible.</p>";
      return;
    }
    const sortedEvents = events.sort((a, b) => {
      if (a.is_private === b.is_private) {
        return new Date(a.date) - new Date(b.date);
      }
      return a.is_private ? 1 : -1;
    });

    // Utiliser Promise.all pour attendre que toutes les cartes soient créées
    const eventCards = await Promise.all(
        sortedEvents.map(async (event) => {
            const card = await createEventCard(event);
            if (event.is_private) {
                card.classList.add("private-event");
            }
            return card;
        })
    );

    eventCards.forEach(card => eventsList.appendChild(card));

  } catch (error) {
    console.error("Erreur lors du chargement des événements:", error.message);
    eventsList.innerHTML = "<p>Une erreur est survenue lors du chargement des événements.</p>";
  }
}

function showFormMessage(message, isError = false) {
  createEventMessage.textContent = message;
  createEventMessage.className = isError ? "message error" : "message success";
  setTimeout(() => {
    createEventMessage.textContent = "";
    createEventMessage.className = "message";
  }, 5000);
}

async function handleCreateEvent(e) {
  e.preventDefault();

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError) throw userError;

    let formData = new FormData(e.target);
    let tags = formData
      .get("tags")
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    let infos_sup = {
      places: parseInt(formData.get("places")) || 0,
    };

    const { data, error } = await supabase
      .from("evenements")
      .insert([
        {
          titre: formData.get("titre"),
          description: formData.get("description"),
          date: formData.get("date"),
          lieu: formData.get("lieu"),
          tags: tags,
          is_private: formData.get("is_private") === "on",
          infos_sup: infos_sup,
          user_id: user.id,
        },
      ])
      .select();

    if (error) throw error;

    showFormMessage("Événement créé avec succès !");
    createEventForm.reset();
    loadEvents();
  } catch (error) {
    console.error("Erreur lors de la création de l'événement:", error);
    showFormMessage(`Erreur lors de la création de l'événement: ${error.message}`, true);
  }
}
createEventForm.addEventListener("submit", handleCreateEvent);
document.addEventListener("DOMContentLoaded", loadEvents);
setInterval(loadEvents, 300000);
