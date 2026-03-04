// --------------------
// Select elements
// --------------------
const startChatBtn = document.getElementById("openChat");
const chatOverlay = document.getElementById("chatOverlay");
const closeBtn = document.getElementById("closeChat");
const form = document.getElementById("ChatForm");
const input = document.getElementById("userInput");
const messagesEl = document.getElementById("messages");
const micBtn = document.getElementById("micBtn");
const fileUpload = document.getElementById("fileUpload");


const firstAidBtn = document.getElementById("firstAidOption");
const firstAidModal = document.getElementById("firstAidModal");
const firstAidClose = document.getElementById("closeModal");
const modalText = document.getElementById("modalText");


const emergencyBtn = document.getElementById("emergencyBtn");


let lastUserQuery = "";


startChatBtn.addEventListener("click", (e) => {
  e.preventDefault();
  chatOverlay.style.display = "flex";
  input.focus();
});

closeBtn.addEventListener("click", () => {
  chatOverlay.style.display = "none";
});

chatOverlay.addEventListener("click", (e) => {
  if (e.target === chatOverlay) chatOverlay.style.display = "none";
});


function formatMessage(text) {
  if (!text) return "";

  
  text = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

  
  text = text.replace(/^\s*[\*\-]\s+(.*)$/gm, "<li>$1</li>");


  if (text.includes("<li>")) {
    text = text.replace(/(<li>.*<\/li>)+/gs, (match) => `<ul>${match}</ul>`);
  }

  text = text.replace(/\n{2,}/g, "<br><br>");

  text = text.replace(/([^\n])\n([^\n])/g, "$1<br>$2");

  return text;
}


function appendMessage(text, sender) {
  const msg = document.createElement("div");
  msg.className = `msg ${sender}`;
  msg.innerHTML = formatMessage(text);

  if (sender === "bot") {
    const ttsBtn = document.createElement("button");
    ttsBtn.className = "tts-btn";
    ttsBtn.textContent = "🔊";
    ttsBtn.title = "Listen";
    ttsBtn.addEventListener("click", () => speakText(text));
    msg.appendChild(ttsBtn);
  }

  messagesEl.appendChild(msg);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return msg;
}

// --------------------
// Text-to-Speech
// --------------------
function speakText(text) {
  if (!("speechSynthesis" in window)) {
    alert("Text-to-Speech not supported in this browser.");
    return;
  }
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 1;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

// --------------------
// Handle form submit (chat)
// --------------------
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;

  lastUserQuery = text;
  appendMessage(text, "user");
  input.value = "";

  const tempMsg = appendMessage("⏳ Thinking...", "bot");

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    });
    const data = await res.json();
    tempMsg.innerHTML = formatMessage(data.reply || "⚠ No response from HealthBot.");

    if (data.reply) {
      const ttsBtn = document.createElement("button");
      ttsBtn.className = "tts-btn";
      ttsBtn.textContent = "🔊";
      ttsBtn.title = "Listen";
      ttsBtn.addEventListener("click", () => speakText(data.reply));
      tempMsg.appendChild(ttsBtn);
    }
  } catch (err) {
    tempMsg.textContent = "⚠ Failed to connect to HealthBot server.";
    console.error(err);
  }

  input.focus();
});

// --------------------
// Speech-to-Text (Mic)
// --------------------
let recognition;
if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = "en-US";

  recognition.onstart = () => micBtn.classList.add("listening");
  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    input.value = transcript;
    input.focus();
  };
  recognition.onerror = () => micBtn.classList.remove("listening");
  recognition.onend = () => micBtn.classList.remove("listening");
} else {
  micBtn.disabled = true;
  micBtn.title = "Speech recognition not supported in this browser.";
}

micBtn.addEventListener("click", () => {
  if (recognition) recognition.start();
  else alert("Speech Recognition not supported in your browser.");
});

// --------------------
// File Upload
// --------------------
fileUpload.addEventListener("change", async () => {
  const file = fileUpload.files[0];
  if (file) {
    appendMessage(`📎 Uploaded: <strong>${file.name}</strong>`, "user");

    const reader = new FileReader();
    reader.onload = function (e) {
      const img = document.createElement("img");
      img.src = e.target.result;
      img.style.maxWidth = "200px";
      img.style.borderRadius = "8px";
      img.style.marginTop = "5px";
      messagesEl.appendChild(img);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    };
    reader.readAsDataURL(file);

    const formData = new FormData();
    formData.append("file", file);

    const tempMsg = appendMessage("⏳ Analyzing image...", "bot");

    try {
      const res = await fetch("/api/image", { method: "POST", body: formData });
      const data = await res.json();
      tempMsg.innerHTML = formatMessage(data.reply || "⚠ No response.");

      if (data.reply) {
        const ttsBtn = document.createElement("button");
        ttsBtn.className = "tts-btn";
        ttsBtn.textContent = "🔊";
        ttsBtn.title = "Listen";
        ttsBtn.addEventListener("click", () => speakText(data.reply));
        tempMsg.appendChild(ttsBtn);
      }
    } catch (err) {
      tempMsg.textContent = "⚠ Failed to analyze image.";
      console.error(err);
    }

    fileUpload.value = "";
  }
});

// --------------------
// Nearby Medical Shops & Hospitals
// --------------------
function openNearbySearch(query) {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}/@${lat},${lng},14z`;
        window.open(mapsUrl, "_blank");
      },
      (err) => {
        console.error("Geolocation error:", err);
        alert("Unable to get your location. Please allow location access.");
      }
    );
  } else {
    alert("Geolocation is not supported in this browser.");
  }
}

const medBtn = document.getElementById("findMedicalShops");
const hospBtn = document.getElementById("findHospitals");

if (medBtn) medBtn.addEventListener("click", () => openNearbySearch("medical shops"));
if (hospBtn) hospBtn.addEventListener("click", () => openNearbySearch("hospitals"));

// --------------------
// First Aid Modal
// --------------------
if (firstAidBtn) {
  firstAidBtn.addEventListener("click", async () => {
    if (!lastUserQuery) {
      modalText.innerHTML = "❓ Please type a disease/condition name in the chat box first.";
      firstAidModal.style.display = "block";
      return;
    }

    modalText.innerHTML = "⏳ Fetching first aid information...";

    try {
      const res = await fetch("/api/firstaid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disease: lastUserQuery }),
      });

      const data = await res.json();
      modalText.innerHTML = formatMessage(data.reply || `⚠ No first aid info available for "${lastUserQuery}".`);

      if (data.reply) {
        const ttsBtn = document.createElement("button");
        ttsBtn.className = "tts-btn";
        ttsBtn.textContent = "🔊";
        ttsBtn.title = "Listen";
        ttsBtn.addEventListener("click", () => speakText(data.reply));
        modalText.appendChild(ttsBtn);
      }
    } catch (err) {
      console.error(err);
      modalText.innerHTML = "⚠ Failed to fetch first aid information.";
    }

    firstAidModal.style.display = "block";
  });
}

if (firstAidClose) {
  firstAidClose.addEventListener("click", () => {
    firstAidModal.style.display = "none";
  });
}

window.addEventListener("click", (e) => {
  if (e.target === firstAidModal) firstAidModal.style.display = "none";
});


if (emergencyBtn) {
  emergencyBtn.addEventListener("click", function(e) {
    e.preventDefault();

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function(position) {
        let lat = position.coords.latitude;
        let lon = position.coords.longitude;

        let message = `🚨 I'm in "Emergency" Please dispatch an ambulance immediately to the above location! My location: https://maps.google.com/?q=${lat},${lon}`;
        let encodedMsg = encodeURIComponent(message);

        let phone = "916381895499";

        window.open(`https://wa.me/${phone}?text=${encodedMsg}`, "_blank");
      }, function(error) {
        alert("Unable to fetch location. Please enable GPS.");
      });
    } else {
      alert("Geolocation is not supported on this device.");
    }
  });
}
