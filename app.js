import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getFirestore, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyD1V7qffQ9-qfVMlFXECUsy74vC7HnOvRA",
  authDomain: "shivprasad-mangal-karyalay.firebaseapp.com",
  projectId: "shivprasad-mangal-karyalay",
  storageBucket: "shivprasad-mangal-karyalay.appspot.com",
  messagingSenderId: "134205032642",
  appId: "1:134205032642:web:af8623e9aeb3e62b63935b"
};

(() => {
  "use strict";

  const ADMIN_PASSWORD = "Shiv@2025";
  /*
   * Firestore testing rules (firestore.rules):
   * rules_version = '2';
   * service cloud.firestore {
   *   match /databases/{database}/documents {
   *     match /{document=**} {
   *       allow read, write: if true;
   *     }
   *   }
   * }
   *
   * Storage testing rules (Firebase Console > Storage > Rules):
   * rules_version = '2';
   * service firebase.storage {
   *   match /b/{bucket}/o {
   *     match /{allPaths=**} {
   *       allow read, write: if true;
   *     }
   *   }
   * }
   * Open rules are for testing only; they allow anyone to overwrite content.
   */
  let db = null;
  let storage = null;
  let contentRef = null;
  try {
    if (Object.values(firebaseConfig).some(value => !value.trim())) {
      throw new Error("Firebase configuration is incomplete.");
    }
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    storage = getStorage(app);
    contentRef = doc(db, "venue", "content");
  } catch (error) {
    console.warn("Firebase is not configured; showing the initial venue content.", error);
  }
  const categories = {
    stage: "लग्न हॉल व स्टेज",
    dining: "जेवण कक्ष / डायनिंग",
    rooms: "खोल्या / रूम्स",
    parking: "बाहेरील परिसर व पार्किंग",
    other: "इतर"
  };
  const initialData = {
    settings: {
      title: "शिवप्रसाद मंगल कार्यालय - भव्य व अविस्मरणीय लग्न सोहळ्यांचे दालन",
      announcement: "",
      address: "हेडावे रोड, नियर गणपती नगर",
      phone: "+91 9503007852",
      phone2: "+91 9422233236",
      phone3: "+91 9130070011",
      email: "pavankumbhar425@gmail.com",
      music: ""
    },
    imageReplacements: {},
    media: [
      { id: "sample-stage-1", type: "image", category: "stage", alt: "भव्य लग्न हॉल आणि स्टेज", url: "hall_main.jpg", fallback: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=1200&q=82" },
      { id: "sample-dining-1", type: "image", category: "dining", alt: "सुसज्ज आणि प्रशस्त जेवण कक्ष", url: "dining.jpg", fallback: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=82" },
      { id: "sample-room-1", type: "image", category: "rooms", alt: "पांढऱ्या चादरीसह प्रशस्त मास्टर बेडरूम", url: "room_featured.jpg", fallback: "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1200&q=82" },
      { id: "sample-exterior-1", type: "image", category: "parking", alt: "कार्यालयाचा बाहेरील परिसर", url: "exterior.jpg", fallback: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=82" },
      { id: "sample-stage-2", type: "image", category: "stage", alt: "मंगल सोहळ्याची सुंदर सजावट", url: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1200&q=82" },
      { id: "sample-dining-2", type: "image", category: "dining", alt: "समारंभातील जेवणाची मेजवानी", url: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=82" },
      { id: "sample-room-2", type: "image", category: "rooms", alt: "सुसज्ज आणि स्वच्छ रूम", url: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=82" },
      { id: "sample-exterior-2", type: "image", category: "parking", alt: "कार्यक्रमस्थळाचा बाहेरील परिसर", url: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1200&q=82" }
    ]
  };

  function normalizeData(parsed) {
    if (!parsed || !parsed.settings || !Array.isArray(parsed.media)) {
      throw new Error("Firestore venue content has an invalid shape.");
    }
    return {
      settings: { ...initialData.settings, ...parsed.settings },
      imageReplacements: parsed.imageReplacements && typeof parsed.imageReplacements === "object"
        ? parsed.imageReplacements
        : {},
      media: parsed.media.filter(item => item && typeof item.url === "string" && categories[item.category])
    };
  }

  let data = structuredClone(initialData);
  const $ = selector => document.querySelector(selector);
  const gallery = $("#galleryGrid");
  let activeFilter = "all";
  let pendingPhotoTarget = null;

  async function saveData() {
    if (!contentRef) {
      showStatus("Firebase कॉन्फिगरेशन पूर्ण नाही; बदल क्लाउडवर सेव्ह होऊ शकले नाहीत.", true);
      return false;
    }
    try {
      await setDoc(contentRef, data);
      return true;
    } catch (error) {
      console.error("Could not save venue content to Firestore.", error);
      showStatus("क्लाउडवर सेव्ह करता आले नाही. Firebase नियम आणि कनेक्शन तपासा.", true);
      return false;
    }
  }

  async function uploadToStorage(fileOrBlob, folder, extension) {
    if (!storage) throw new Error("Firebase Storage कॉन्फिगरेशन उपलब्ध नाही.");
    const uniqueId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const fileRef = ref(storage, `${folder}/${uniqueId}.${extension}`);
    const snapshot = await uploadBytes(fileRef, fileOrBlob, { contentType: fileOrBlob.type });
    return getDownloadURL(snapshot.ref);
  }

  function safeExternalUrl(value) {
    if (typeof value !== "string" || !value.trim()) return "";
    try {
      const url = new URL(value, window.location.href);
      return ["https:", "http:"].includes(url.protocol) ? url.href : "";
    } catch {
      return "";
    }
  }

  function safeMediaUrl(value) {
    const external = safeExternalUrl(value);
    if (external) return external;
    if (/^data:(image\/(?:jpeg|png|gif|webp|avif)|video\/(?:mp4|webm));base64,/i.test(value)) return value;
    return /^(?!\/)[\w.-]+\/?[\w.-]+\.(?:jpe?g|png|gif|webp|avif|mp4|webm)$/i.test(value) ? value : "";
  }

  function safeAudioUrl(value) {
    const external = safeExternalUrl(value);
    if (external) return external;
    return /^data:audio\/(?:mpeg|mp3|ogg|wav|aac|mp4);base64,/i.test(value) ? value : "";
  }

  function applySavedPhotos() {
    document.querySelectorAll("img[data-photo-key]").forEach(image => {
      const key = image.dataset.photoKey;
      if (!image.dataset.defaultSrc) image.dataset.defaultSrc = image.getAttribute("src") || "";
      const saved = data.imageReplacements[key];
      if (saved) {
        image.src = saved;
        image.removeAttribute("data-fallback");
      } else {
        image.src = image.dataset.defaultSrc;
      }
    });
  }

  function addPhotoEditButton(container, image, target) {
    container.classList.add("photo-edit-container");
    const change = document.createElement("button");
    change.type = "button";
    change.className = "photo-edit-button";
    change.setAttribute("aria-label", `फोटो बदला: ${image.alt}`);
    change.innerHTML = '<span aria-hidden="true">📷</span> फोटो बदला';
    change.addEventListener("click", event => {
      event.stopPropagation();
      pendingPhotoTarget = target;
      $("#photoFilePicker").value = "";
      $("#photoFilePicker").click();
    });
    container.append(change);
    if (target.type === "gallery") {
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "photo-delete-button";
      remove.textContent = "✕ काढा";
      remove.setAttribute("aria-label", `गॅलरीतून फोटो काढा: ${image.alt}`);
      remove.addEventListener("click", async event => {
        event.stopPropagation();
        if (!window.confirm("हा फोटो गॅलरीतून काढायचा?")) return;
        const previousMedia = data.media;
        data.media = data.media.filter(item => item.id !== target.id);
        if (await saveData()) renderGallery();
        else {
          data.media = previousMedia;
          renderGallery();
        }
      });
      container.append(remove);
    }
  }

  function initStaticPhotoEditors() {
    document.querySelectorAll("img[data-photo-key]").forEach(image => {
      image.dataset.defaultSrc = image.getAttribute("src") || "";
      addPhotoEditButton(image.parentElement, image, { type: "static", key: image.dataset.photoKey, image });
    });
    applySavedPhotos();
  }

  function setEditMode(enabled) {
    document.body.classList.toggle("edit-mode", enabled);
    $("#adminTrigger").textContent = enabled ? "✎ Edit Mode: ON" : "✎ Admin / Edit Mode";
    $("#adminTrigger").setAttribute("aria-pressed", String(enabled));
    $("#adminTrigger").setAttribute("aria-label", enabled ? "Edit Mode बंद करा किंवा व्यवस्थापन उघडा" : "Admin edit mode सुरू करा");
    if (enabled) {
      $("#editModeSwitch").textContent = "Edit Mode: ON — बंद करा";
      $("#editModeSwitch").setAttribute("aria-pressed", "true");
    }
  }

  async function compressImage(file) {
    let bitmap;
    try {
      bitmap = await createImageBitmap(file);
    } catch (error) {
      throw new Error("हा फोटो फॉरमॅट या ब्राउझरमध्ये उघडता आला नाही. JPG किंवा PNG निवडा.", { cause: error });
    }
    const maxDimension = 1100;
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) {
      bitmap.close();
      throw new Error("फोटो प्रक्रिया करता आली नाही.");
    }
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    for (const quality of [0.76, 0.66, 0.56, 0.46]) {
      const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", quality));
      if (!blob) throw new Error("फोटो संकुचित करता आला नाही.");
      if (blob.size <= 220 * 1024) return blob;
    }
    throw new Error("संकुचित फोटो अजून मोठा आहे. दुसरा फोटो निवडा.");
  }

  $("#photoFilePicker").addEventListener("change", async event => {
    const picker = event.currentTarget;
    const file = picker.files?.[0];
    const target = pendingPhotoTarget;
    if (!file || !target) return;
    if (!file.type.startsWith("image/")) {
      showStatus("कृपया फोटो फाइल निवडा.", true);
      return;
    }
    try {
      showStatus("फोटो क्लाउडवर अपलोड होत आहे...");
      const photoBlob = await compressImage(file);
      const photoUrl = await uploadToStorage(photoBlob, target.type === "static" ? "photos" : "gallery", "jpg");
      let rollbackPhoto = null;
      if (target.type === "static") {
        const previous = data.imageReplacements[target.key];
        data.imageReplacements[target.key] = photoUrl;
        rollbackPhoto = () => {
          if (previous === undefined) delete data.imageReplacements[target.key];
          else data.imageReplacements[target.key] = previous;
          applySavedPhotos();
        };
        applySavedPhotos();
      } else {
        const item = data.media.find(media => media.id === target.id);
        if (!item) throw new Error("गॅलरी फोटो सापडला नाही.");
        const previousUrl = item.url;
        const previousFallback = item.fallback;
        item.url = photoUrl;
        delete item.fallback;
        rollbackPhoto = () => {
          item.url = previousUrl;
          if (previousFallback === undefined) delete item.fallback;
          else item.fallback = previousFallback;
          renderGallery();
        };
        renderGallery();
      }
      if (await saveData()) showStatus("फोटो बदलला आणि सर्व उपकरणांवर सिंक केला.");
      else if (rollbackPhoto) rollbackPhoto();
    } catch (error) {
      console.error("Could not save the selected photo.", error);
      showStatus(error.message || "फोटो क्लाउडवर अपलोड करता आला नाही.", true);
    } finally {
      pendingPhotoTarget = null;
      picker.value = "";
    }
  });

  function renderGallery() {
    const items = data.media.filter(item => activeFilter === "all"
      || (activeFilter === "videos" ? item.type === "video" : item.category === activeFilter));
    gallery.replaceChildren();
    items.forEach(item => {
      const card = document.createElement("div");
      card.className = "gallery-item";
      card.setAttribute("aria-label", `${item.type === "video" ? "व्हिडिओ" : "फोटो"}: ${item.alt}`);
      const url = safeMediaUrl(item.url);
      if (item.type === "video") {
        card.tabIndex = 0;
        card.setAttribute("role", "button");
        const poster = safeExternalUrl(item.poster || "");
        const preview = document.createElement("video");
        preview.src = url;
        preview.muted = true;
        preview.playsInline = true;
        preview.preload = "metadata";
        if (poster) preview.poster = poster;
        card.append(preview);
        const play = document.createElement("span");
        play.className = "video-mark";
        play.setAttribute("aria-hidden", "true");
        play.textContent = "▶";
        card.append(play);
      } else {
        const image = document.createElement("img");
        image.src = url;
        image.alt = item.alt;
        image.loading = "lazy";
        image.tabIndex = 0;
        image.setAttribute("role", "button");
        image.setAttribute("aria-label", `मोठा फोटो पहा: ${item.alt}`);
        image.dataset.fallback = safeExternalUrl(item.fallback || "");
        attachImageFallback(image);
        card.append(image);
        image.addEventListener("keydown", event => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openLightbox(item);
          }
        });
        addPhotoEditButton(card, image, { type: "gallery", id: item.id });
      }
      const caption = document.createElement("span");
      caption.className = "gallery-caption";
      caption.textContent = item.alt;
      card.append(caption);
      card.addEventListener("click", event => {
        if (!event.target.closest(".photo-edit-button")) openLightbox(item);
      });
      card.addEventListener("keydown", event => {
        if (item.type === "video" && event.target === card && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          openLightbox(item);
        }
      });
      gallery.append(card);
    });
    if (!items.length) {
      const empty = document.createElement("p");
      empty.className = "gallery-empty";
      empty.textContent = "या श्रेणीमध्ये सध्या फोटो उपलब्ध नाहीत.";
      gallery.append(empty);
    }
  }

  function openLightbox(item) {
    const content = $("#lightboxContent");
    content.replaceChildren();
    const url = safeMediaUrl(item.url);
    let media;
    if (item.type === "video") {
      media = document.createElement("video");
      media.controls = true;
      media.autoplay = true;
      media.playsInline = true;
    } else {
      media = document.createElement("img");
      media.alt = item.alt;
    }
    media.src = url;
    content.append(media);
    $("#lightboxCaption").textContent = item.alt;
    $("#lightbox").showModal();
    document.body.classList.add("dialog-open");
  }

  function renderSettings() {
    const settings = data.settings;
    const title = settings.title || initialData.settings.title;
    const titleParts = title.split(/\s+[—-]\s+/);
    $("#heroTitle").innerHTML = `${escapeHTML(titleParts.shift())}<br /><em>${escapeHTML(titleParts.join(" — "))}</em>`;
    $("#addressText").textContent = settings.address || initialData.settings.address;
    const announcement = $("#announcement");
    announcement.textContent = settings.announcement;
    announcement.hidden = !settings.announcement.trim();
    const configuredPhones = [settings.phone, settings.phone2, settings.phone3];
    const phones = configuredPhones.filter(phone => phone && phone.trim());
    document.querySelectorAll(".hero-call").forEach(link => {
      const phone = configuredPhones[Number(link.dataset.phoneIndex)] || "";
      link.hidden = !phone.trim();
      link.href = phone.trim() ? `tel:${phone.replace(/[^\d+]/g, "")}` : "#contact";
      const number = link.querySelector("span");
      if (number) number.textContent = phone.trim();
    });
    const phoneList = $("#contactPhone");
    phoneList.replaceChildren();
    phones.forEach(phone => {
      const link = document.createElement("a");
      link.href = `tel:${phone.replace(/[^\d+]/g, "")}`;
      link.textContent = `📞 ${phone}`;
      phoneList.append(link);
    });
    const email = settings.email.trim();
    const emailLink = $("#emailLink");
    emailLink.textContent = email;
    emailLink.href = email ? `mailto:${email}` : "#contact";
    const primaryPhone = phones[0] || "";
    $("#callLink").href = primaryPhone ? `tel:${primaryPhone.replace(/[^\d+]/g, "")}` : "#contact";
    const whatsapp = primaryPhone.replace(/\D/g, "");
    const message = encodeURIComponent("नमस्कार, शिवप्रसाद मंगल कार्यालयातील बुकिंगविषयी चौकशी करायची आहे.");
    const whatsappUrl = whatsapp ? `https://wa.me/${whatsapp}?text=${message}` : "#contact";
    ["#whatsappLink", "#headerWhatsappLink", "#heroWhatsappLink"].forEach(selector => {
      $(selector).href = whatsappUrl;
    });
    const audio = $("#backgroundAudio");
    const audioToggle = $("#audioToggle");
    const audioMute = $("#audioMute");
    const musicUrl = safeAudioUrl(settings.music);
    if (musicUrl && audio.src !== musicUrl) {
      audio.src = musicUrl;
      audio.load();
    } else if (!musicUrl && audio.src) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      audioToggle.classList.remove("playing");
    }
    audioToggle.disabled = !musicUrl;
    audioMute.disabled = !musicUrl;
    audioMute.classList.toggle("muted", audio.muted);
    audioMute.setAttribute("aria-label", audio.muted ? "संगीत अनम्यूट करा" : "संगीत म्यूट करा");
  }

  function escapeHTML(value) {
    return value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  }

  function attachImageFallback(image) {
    const useFallback = () => {
      if (image.dataset.fallback && image.src !== image.dataset.fallback) {
        image.src = image.dataset.fallback;
        image.removeAttribute("data-fallback");
      }
    };
    image.addEventListener("error", useFallback, { once: true });
    if (image.complete && image.naturalWidth === 0) useFallback();
  }

  function showStatus(message, isError = false) {
    const status = $("#adminStatus");
    status.textContent = message;
    status.style.color = isError ? "#9c2b3c" : "#55744b";
    window.setTimeout(() => { status.textContent = ""; }, 3500);
  }

  function populateSettingsForm() {
    const form = $("#settingsForm");
    Object.entries(data.settings).forEach(([key, value]) => {
      const input = form.elements.namedItem(key);
      if (input) input.value = key === "music" && String(value).startsWith("data:") ? "" : value;
    });
  }

  function openAdminDialog() {
    populateSettingsForm();
    renderAdminMedia();
    $("#adminDialog").showModal();
    document.body.classList.add("dialog-open");
  }

  function renderAdminMedia() {
    const list = $("#adminMediaList");
    list.replaceChildren();
    data.media.forEach(item => {
      const row = document.createElement("div");
      row.className = "admin-media-row";
      const preview = item.type === "video" ? document.createElement("video") : document.createElement("img");
      preview.src = safeMediaUrl(item.url);
      if (preview instanceof HTMLVideoElement) {
        preview.muted = true;
      } else {
        preview.dataset.fallback = safeExternalUrl(item.fallback || "");
        attachImageFallback(preview);
      }
      preview.alt = item.alt;
      const title = document.createElement("span");
      title.textContent = `${categories[item.category]} — ${item.alt}`;
      const edit = document.createElement("button");
      edit.type = "button";
      edit.textContent = "संपादित";
      edit.addEventListener("click", () => {
        const form = $("#mediaForm");
        form.elements.namedItem("mediaId").value = item.id;
        form.elements.namedItem("type").value = item.type;
        form.elements.namedItem("url").value = item.url.startsWith("data:") ? "" : item.url;
        form.elements.namedItem("alt").value = item.alt;
        form.elements.namedItem("category").value = item.category;
        form.querySelector('button[type="submit"]').textContent = "बदल सेव्ह करा";
        form.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "काढा";
      remove.addEventListener("click", async () => {
        const previousMedia = data.media;
        data.media = data.media.filter(media => media.id !== item.id);
        if (await saveData()) {
          const form = $("#mediaForm");
          if (form.elements.namedItem("mediaId").value === item.id) {
            form.reset();
            form.querySelector('button[type="submit"]').textContent = "गॅलरीत जोडा";
          }
          renderGallery();
          renderAdminMedia();
          showStatus("मीडिया काढला.");
        } else {
          data.media = previousMedia;
          renderGallery();
          renderAdminMedia();
        }
      });
      row.append(preview, title, edit, remove);
      list.append(row);
    });
  }

  $("#settingsForm").addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    const musicUrl = String(fields.get("music")).trim();
    const musicFile = fields.get("musicFile");
    const clearMusic = fields.get("clearMusic") === "on";
    if (clearMusic && (musicUrl || (musicFile instanceof File && musicFile.size > 0))) {
      showStatus("संगीत काढण्यासाठी URL किंवा ऑडिओ फाइल रिकामी ठेवा.", true);
      return;
    }
    if (musicFile instanceof File && musicFile.size > 0 && musicFile.size > 1024 * 1024) {
      showStatus("ऑडिओ फाइल १ MB पेक्षा मोठी आहे. सार्वजनिक HTTPS URL वापरा.", true);
      return;
    }
    if (musicFile instanceof File && musicFile.size > 0 && musicUrl) {
      showStatus("ऑडिओ URL किंवा फाइल — यापैकी एकच पर्याय निवडा.", true);
      return;
    }
    let music = clearMusic ? "" : data.settings.music || "";
    if (!clearMusic && musicUrl) {
      if (!safeExternalUrl(musicUrl)) {
        showStatus("संगीत URL हा http किंवा https ने सुरू होणारा हवा.", true);
        return;
      }
      music = musicUrl;
    } else if (!clearMusic && musicFile instanceof File && musicFile.size > 0) {
      if (!["audio/mpeg", "audio/mp3", "audio/ogg", "audio/wav", "audio/aac", "audio/mp4"].includes(musicFile.type)) {
        showStatus("MP3, OGG, WAV किंवा AAC ऑडिओ फाइल निवडा.", true);
        return;
      }
      try {
        showStatus("ऑडिओ क्लाउडवर अपलोड होत आहे...");
        music = await uploadToStorage(musicFile, "audio", musicFile.type.split("/")[1] || "audio");
      } catch (error) {
        console.error("Could not read the selected audio file.", error);
        showStatus(error.message || "ऑडिओ फाइल क्लाउडवर अपलोड करता आली नाही.", true);
        return;
      }
    }
    const previousSettings = data.settings;
    data.settings = {
      title: String(fields.get("title")).trim() || initialData.settings.title,
      announcement: String(fields.get("announcement")).trim(),
      address: String(fields.get("address")).trim(),
      phone: String(fields.get("phone")).trim(),
      phone2: String(fields.get("phone2")).trim(),
      phone3: String(fields.get("phone3")).trim(),
      email: String(fields.get("email")).trim(),
      music
    };
    if (await saveData()) {
      renderSettings();
      form.elements.namedItem("clearMusic").checked = false;
      form.elements.namedItem("musicFile").value = "";
      showStatus("सेटिंग्ज सेव्ह झाल्या.");
    } else {
      data.settings = previousSettings;
      renderSettings();
    }
  });

  $("#mediaForm").addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    const selectedType = String(fields.get("type"));
    const mediaId = String(fields.get("mediaId"));
    const existing = data.media.find(item => item.id === mediaId);
    const enteredUrl = String(fields.get("url")).trim();
    const file = fields.get("file");
    if (file instanceof File && selectedType === "video" && file.size > 2 * 1024 * 1024) {
      showStatus("अपलोड फाइल २ MB पेक्षा मोठी आहे. त्याऐवजी HTTPS URL वापरा.", true);
      return;
    }
    if (file instanceof File && file.size > 0 && enteredUrl) {
      showStatus("URL किंवा फाइल — यापैकी एकच पर्याय निवडा.", true);
      return;
    }
    let url = enteredUrl;
    let type = selectedType;
    if (file instanceof File && file.size > 0) {
      const accepted = selectedType === "image"
        ? file.type.startsWith("image/")
        : ["video/mp4", "video/webm"].includes(file.type);
      if (!accepted) {
        showStatus(selectedType === "image" ? "कृपया समर्थित फोटो फाइल निवडा." : "व्हिडिओसाठी MP4 किंवा WebM फाइल निवडा.", true);
        return;
      }
      try {
        if (selectedType === "image") {
          showStatus("फोटो क्लाउडवर अपलोड होत आहे...");
          url = await uploadToStorage(await compressImage(file), "gallery", "jpg");
        } else {
          showStatus("व्हिडिओ क्लाउडवर अपलोड होत आहे...");
          url = await uploadToStorage(file, "gallery", file.type.split("/")[1] || "video");
        }
      } catch (error) {
        console.error("Could not read uploaded media.", error);
        showStatus(error.message || "फाइल क्लाउडवर अपलोड करता आली नाही.", true);
        return;
      }
      type = selectedType;
    } else if (enteredUrl && !safeExternalUrl(url)) {
      showStatus("मीडिया URL हा http किंवा https ने सुरू होणारा हवा.", true);
      return;
    } else if (!enteredUrl && existing) {
      url = existing.url;
      type = existing.type;
    } else if (!enteredUrl) {
      showStatus("मीडिया URL द्या किंवा फाइल अपलोड करा.", true);
      return;
    }
    const updatedMedia = {
      id: existing ? existing.id : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type,
      category: String(fields.get("category")),
      alt: String(fields.get("alt")).trim(),
      url,
      ...(existing && url === existing.url && existing.fallback ? { fallback: existing.fallback } : {})
    };
    const previousData = structuredClone(data);
    if (existing) {
      Object.assign(existing, updatedMedia);
    } else {
      data.media.unshift(updatedMedia);
    }
    if (await saveData()) {
      renderGallery();
      renderAdminMedia();
      form.reset();
      form.querySelector('button[type="submit"]').textContent = "गॅलरीत जोडा";
      showStatus(existing ? "मीडिया बदल सेव्ह झाले." : "मीडिया गॅलरीत जोडला.");
    } else {
      data = previousData;
      renderGallery();
      renderAdminMedia();
    }
  });

  document.querySelectorAll(".filter-button").forEach(button => {
    button.addEventListener("click", () => {
      document.querySelector(".filter-button.active")?.classList.remove("active");
      button.classList.add("active");
      activeFilter = button.dataset.filter;
      renderGallery();
    });
  });

  $("#backgroundAudio").addEventListener("pause", () => {
    $("#audioToggle").classList.remove("playing");
    $("#audioToggle").setAttribute("aria-label", "शहनाई संगीत सुरू करा");
  });
  $("#backgroundAudio").addEventListener("play", () => {
    $("#audioToggle").classList.add("playing");
    $("#audioToggle").setAttribute("aria-label", "शहनाई संगीत थांबवा");
  });

  $("#audioToggle").addEventListener("click", async event => {
    const audio = $("#backgroundAudio");
    if (!audio.src) {
      showStatus("आधी व्यवस्थापनातून संगीत URL जोडा.");
      return;
    }
    if (audio.paused) {
      try {
        await audio.play();
        event.currentTarget.classList.add("playing");
        event.currentTarget.setAttribute("aria-label", "शहनाई संगीत थांबवा");
      } catch (error) {
        console.error("Could not play background music.", error);
        showStatus("संगीत सुरू झाले नाही. ऑडिओ URL तपासा.", true);
      }
    } else {
      audio.pause();
      event.currentTarget.classList.remove("playing");
      event.currentTarget.setAttribute("aria-label", "शहनाई संगीत सुरू करा");
    }
  });
  $("#audioMute").addEventListener("click", event => {
    const audio = $("#backgroundAudio");
    audio.muted = !audio.muted;
    event.currentTarget.classList.toggle("muted", audio.muted);
    event.currentTarget.setAttribute("aria-label", audio.muted ? "संगीत अनम्यूट करा" : "संगीत म्यूट करा");
    event.currentTarget.title = audio.muted ? "संगीत अनम्यूट करा" : "संगीत म्यूट करा";
  });

  $("#menuToggle").addEventListener("click", event => {
    const nav = $("#mainNav");
    const expanded = nav.classList.toggle("open");
    event.currentTarget.setAttribute("aria-expanded", String(expanded));
  });
  $("#mainNav").addEventListener("click", event => {
    if (event.target.closest("a")) {
      $("#mainNav").classList.remove("open");
      $("#menuToggle").setAttribute("aria-expanded", "false");
    }
  });

  function getInquiryDetails(form) {
    const fields = new FormData(form);
    return {
      name: String(fields.get("name")),
      email: String(fields.get("email")),
      message: String(fields.get("message"))
    };
  }

  $("#inquiryForm").addEventListener("submit", event => {
    event.preventDefault();
    if (!data.settings.email) {
      $("#formNote").textContent = "चौकशीसाठी व्यवस्थापनातून ईमेल पत्ता जोडा.";
      return;
    }
    const details = getInquiryDetails(event.currentTarget);
    const subject = encodeURIComponent(`बुकिंग चौकशी — ${details.name}`);
    const body = encodeURIComponent(`नाव: ${details.name}\nईमेल: ${details.email}\n\n${details.message}`);
    window.location.href = `mailto:${encodeURIComponent(data.settings.email)}?subject=${subject}&body=${body}`;
  });

  $("#whatsappFormButton").addEventListener("click", () => {
    const form = $("#inquiryForm");
    if (!form.reportValidity()) return;
    const details = getInquiryDetails(form);
    const phone = (data.settings.phone || "").replace(/\D/g, "");
    if (!phone) {
      $("#formNote").textContent = "WhatsApp चौकशीसाठी व्यवस्थापनातून फोन नंबर जोडा.";
      return;
    }
    const message = encodeURIComponent(`नमस्कार, शिवप्रसाद मंगल कार्यालयातील बुकिंगविषयी चौकशी.\nनाव: ${details.name}\nईमेल: ${details.email}\nसंदेश: ${details.message}`);
    window.open(`https://wa.me/${phone}?text=${message}`, "_blank", "noopener");
  });

  $("#adminTrigger").addEventListener("click", () => {
    if (document.body.classList.contains("edit-mode")) {
      openAdminDialog();
      return;
    }
    $("#authError").textContent = "";
    $("#authForm").reset();
    $("#adminAuthDialog").showModal();
    document.body.classList.add("dialog-open");
    $("#adminPassword").focus();
  });

  $("#authForm").addEventListener("submit", event => {
    event.preventDefault();
    const password = $("#adminPassword").value;
    const errorLabel = $("#authError");
    if (password !== ADMIN_PASSWORD) {
      errorLabel.textContent = "पासवर्ड चुकीचा आहे. पुन्हा प्रयत्न करा.";
      return;
    }
    $("#adminAuthDialog").close();
    setEditMode(true);
    openAdminDialog();
  });

  $("#editModeSwitch").addEventListener("click", () => {
    setEditMode(false);
    $("#adminDialog").close();
  });

  document.querySelectorAll(".admin-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelector(".admin-tab.active")?.classList.remove("active");
      document.querySelector(".admin-panel.active")?.classList.remove("active");
      tab.classList.add("active");
      $(`#${tab.dataset.panel}`).classList.add("active");
    });
  });

  $("#resetData").addEventListener("click", async () => {
    if (!window.confirm("सेव्ह केलेली सामग्री काढून मूळ सामग्री पूर्ववत करायची?")) return;
    const previousData = data;
    data = structuredClone(initialData);
    if (!await saveData()) {
      data = previousData;
      return;
    }
    renderSettings();
    renderGallery();
    renderAdminMedia();
    applySavedPhotos();
    $("#settingsForm").reset();
    populateSettingsForm();
    $("#mediaForm").reset();
    showStatus("मूळ सामग्री पूर्ववत झाली.");
  });

  document.querySelectorAll("[data-close]").forEach(button => {
    button.addEventListener("click", () => $(`#${button.dataset.close}`).close());
  });
  document.querySelectorAll("dialog").forEach(dialog => {
    dialog.addEventListener("close", () => {
      if (!document.querySelector("dialog[open]")) document.body.classList.remove("dialog-open");
      if (dialog.id === "lightbox") $("#lightboxContent").replaceChildren();
    });
    dialog.addEventListener("click", event => {
      if (event.target === dialog) dialog.close();
    });
  });

  $("#year").textContent = new Date().getFullYear();
  document.querySelectorAll("img[data-fallback]").forEach(attachImageFallback);
  initStaticPhotoEditors();
  renderSettings();
  renderGallery();
  if (contentRef) {
    onSnapshot(contentRef, snapshot => {
      try {
        data = snapshot.exists() ? normalizeData(snapshot.data()) : structuredClone(initialData);
        applySavedPhotos();
        renderGallery();
        renderSettings();
        if ($("#adminDialog").open) renderAdminMedia();
      } catch (error) {
        console.error("Could not apply venue content from Firestore.", error);
      }
    }, error => {
      console.error("Could not listen for venue content updates.", error);
      showStatus("क्लाउड अपडेट मिळवता आले नाहीत.", true);
    });
  }
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    document.querySelectorAll(".reveal").forEach(element => observer.observe(element));
  } else {
    document.querySelectorAll(".reveal").forEach(element => element.classList.add("visible"));
  }
})();
