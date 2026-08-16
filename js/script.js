/* =========================================================
   WEBSITE MASJID AN-NUR
   MAIN JAVASCRIPT
   =========================================================

   FITUR:
   1. Jam realtime WIB
   2. Tanggal Masehi
   3. Tanggal Hijriyah
   4. Jadwal sholat Kabupaten Malang
   5. Navigasi jadwal:
      - Hari sebelumnya
      - Hari ini
      - Hari berikutnya
   6. Countdown sholat hari ini
   7. Background hero berdasarkan waktu
   8. Navbar saat scroll
   9. Mobile menu
   10. Toggle adzan
   11. Donasi
   12. Filter agenda
   13. Animasi section
========================================================= */

/* =========================================================
   KONFIGURASI UTAMA
========================================================= */

// Zona waktu website
const TIMEZONE = "Asia/Jakarta";

// ID Kabupaten Malang pada API MyQuran
const CITY_ID = "1614";

// Lokasi Masjid
const LOCATION_NAME = "Desa Asrikaton, Kecamatan Pakis, Kabupaten Malang";

/* =========================================================
   VARIABEL GLOBAL
========================================================= */

// Menyimpan jadwal sholat yang sedang ditampilkan
let prayerSchedule = null;

// Menyimpan tanggal yang sedang dilihat
let selectedDate = null;

// Menyimpan tanggal hari ini
let todayDate = null;

// Menyimpan jam terakhir untuk background
let lastBackgroundHour = null;

// Mencegah klik tombol terlalu cepat ketika API sedang loading
let isLoadingSchedule = false;

/* =========================================================
   HELPER: FORMAT ANGKA 2 DIGIT
========================================================= */

function pad(number) {
  return String(number).padStart(2, "0");
}

/* =========================================================
   HELPER: MENDAPATKAN WAKTU WIB
========================================================= */

function getJakartaTime() {
  const now = new Date();

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const result = {};

  parts.forEach((part) => {
    if (part.type !== "literal") {
      result[part.type] = part.value;
    }
  });

  return new Date(
    Date.UTC(
      Number(result.year),
      Number(result.month) - 1,
      Number(result.day),
      Number(result.hour),
      Number(result.minute),
      Number(result.second)
    )
  );
}

/* =========================================================
   HELPER: MENGUBAH DATE MENJADI YYYY-MM-DD
========================================================= */

function dateToString(date) {
  const year = date.getUTCFullYear();
  const month = pad(date.getUTCMonth() + 1);
  const day = pad(date.getUTCDate());

  return `${year}-${month}-${day}`;
}

/* =========================================================
   HELPER: MEMBUAT DATE DARI YYYY-MM-DD
========================================================= */

function stringToDate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
}

/* =========================================================
   HELPER: CEK APAKAH TANGGAL = HARI INI
========================================================= */

function isToday(dateString) {
  return dateString === todayDate;
}

/* =========================================================
   TANGGAL HIJRIYAH UNTUK HERO
========================================================= */

function updateHijriDate() {
  const hijriElement = document.getElementById("hijri-date");

  if (!hijriElement) {
    return;
  }

  try {
    const formatter = new Intl.DateTimeFormat("id-ID", {
      calendar: "islamic-umalqura",
      timeZone: TIMEZONE,
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const hijriDate = formatter.format(new Date());
    hijriElement.textContent = hijriDate;
  } catch (error) {
    console.error("Gagal menampilkan tanggal Hijriyah:", error);
    hijriElement.textContent = "Tanggal Hijriyah tidak tersedia";
  }
}

/* =========================================================
   UPDATE JAM REALTIME
========================================================= */

function updateClock() {
  const now = getJakartaTime();

  const hour = now.getUTCHours();
  const minute = now.getUTCMinutes();
  const second = now.getUTCSeconds();

  const timeString = `${pad(hour)}:${pad(minute)}:${pad(second)}`;

  const currentTime = document.getElementById("current-time-top");
  if (currentTime) {
    currentTime.textContent = timeString;
  }

  const dateElement = document.getElementById("masehi-date");
  if (dateElement) {
    const formattedDate = new Intl.DateTimeFormat("id-ID", {
      timeZone: TIMEZONE,
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date());

    dateElement.textContent = formattedDate;
  }

  updateHijriDate();

  if (selectedDate && isToday(selectedDate)) {
    updateCountdown(now);
  }
}

/* =========================================================
   BACKGROUND HERO BERDASARKAN JAM
========================================================= */

function updateHeroBackground() {
  const hero = document.getElementById("hero-background");

  if (!hero) {
    return;
  }

  const now = getJakartaTime();
  const hour = now.getUTCHours();

  let image = "";
  let period = "";

  if (hour >= 4 && hour < 6) {
    image = "images/subuh.jpeg";
    period = "subuh";
  } else if (hour >= 6 && hour < 11) {
    image = "images/pagi.jpeg";
    period = "pagi";
  } else if (hour >= 11 && hour < 15) {
    image = "images/siang.jpeg";
    period = "siang";
  } else if (hour >= 15 && hour < 18) {
    image = "images/sore.jpeg";
    period = "sore";
  } else {
    image = "images/malam.jpeg";
    period = "malam";
  }

  hero.dataset.period = period;
  hero.style.backgroundImage = `linear-gradient(
            rgba(0, 0, 0, 0.60),
            rgba(0, 0, 0, 0.70)
        ),
        url("${image}")`;
}

/* =========================================================
   CEK PERGANTIAN BACKGROUND
========================================================= */

function checkBackgroundTime() {
  const now = getJakartaTime();
  const hour = now.getUTCHours();

  if (hour !== lastBackgroundHour) {
    lastBackgroundHour = hour;
    updateHeroBackground();
  }
}

/* =========================================================
   HELPER: MEMBUAT TARGET WAKTU SHOLAT
========================================================= */

function createPrayerDate(baseDate, timeString) {
  if (!timeString) {
    return null;
  }

  const [hour, minute] = timeString.split(":").map(Number);

  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return null;
  }

  const target = new Date(baseDate);
  target.setUTCHours(hour, minute, 0, 0);

  return target;
}

/* =========================================================
   COUNTDOWN SHOLAT
========================================================= */

function updateCountdown(now) {
  if (!prayerSchedule || !selectedDate || !isToday(selectedDate)) {
    return;
  }

  const prayers = [
    { key: "subuh", name: "Subuh" },
    { key: "dzuhur", name: "Dzuhur" },
    { key: "ashar", name: "Ashar" },
    { key: "maghrib", name: "Maghrib" },
    { key: "isya", name: "Isya" },
  ];

  let nextPrayer = null;
  let targetTime = null;

  for (const prayer of prayers) {
    const time = prayerSchedule[prayer.key];

    if (!time) {
      continue;
    }

    const target = createPrayerDate(now, time);

    if (target && target > now) {
      nextPrayer = prayer;
      targetTime = target;
      break;
    }
  }

  if (!nextPrayer && prayerSchedule.subuh) {
    nextPrayer = { key: "subuh", name: "Subuh" };
    targetTime = createPrayerDate(now, prayerSchedule.subuh);

    if (targetTime) {
      targetTime.setUTCDate(targetTime.getUTCDate() + 1);
    }
  }

  if (!nextPrayer || !targetTime) {
    return;
  }

  let difference = targetTime.getTime() - now.getTime();

  if (difference < 0) {
    difference = 0;
  }

  const totalSeconds = Math.floor(difference / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const prayerName = document.getElementById("next-prayer-name");
  if (prayerName) {
    prayerName.textContent = nextPrayer.name;
  }

  const countdown = document.getElementById("countdown");
  if (countdown) {
    countdown.textContent = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }

  document.querySelectorAll(".prayer-card").forEach((card) => {
    card.classList.remove("active");
  });

  const activeCard = document.querySelector(
    `.prayer-card[data-prayer="${nextPrayer.key}"]`,
  );

  if (activeCard) {
    activeCard.classList.add("active");
  }
}

/* =========================================================
   UPDATE JAM PADA KARTU SHOLAT
========================================================= */

function updatePrayerElement(prayerName, time) {
  const element = document.getElementById(`schedule-time-${prayerName}`);

  if (element && time) {
    element.textContent = time;
  }
}

/* =========================================================
   RESET HIGHLIGHT KARTU
========================================================= */

function resetPrayerCards() {
  document.querySelectorAll(".prayer-card").forEach((card) => {
    card.classList.remove("active");
  });
}

/* =========================================================
   TAMPILKAN STATUS LOADING JADWAL
========================================================= */

function showScheduleLoading() {
  const prayers = ["subuh", "dzuhur", "ashar", "maghrib", "isya"];

  prayers.forEach((prayer) => {
    const element = document.getElementById(`schedule-time-${prayer}`);

    if (element) {
      element.textContent = "...";
    }
  });
}

/* =========================================================
   UPDATE HEADER TANGGAL JADWAL
========================================================= */

function updateScheduleDateHeader(dateString, hijriDate) {
  const currentDateElement = document.getElementById("current-date-2");

  if (currentDateElement) {
    const date = stringToDate(dateString);

    currentDateElement.textContent = new Intl.DateTimeFormat("id-ID", {
      timeZone: "UTC",
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
  }

  const hijriElement = document.getElementById("hijri-date-2");

  if (hijriElement) {
    if (hijriDate) {
      hijriElement.textContent = hijriDate;
    } else {
      hijriElement.textContent = "";
    }
  }
}

/* =========================================================
   UPDATE TOMBOL HARI INI
========================================================= */

function updateTodayButton() {
  const todayButton = document.querySelector("#prev-day + span");

  if (!todayButton) {
    return;
  }

  todayButton.textContent = "Hari Ini";
}

/* =========================================================
   LOAD JADWAL SHOLAT BERDASARKAN TANGGAL
========================================================= */

async function loadPrayerSchedule(dateString) {
  if (isLoadingSchedule) {
    return;
  }

  isLoadingSchedule = true;

  if (!dateString) {
    dateString = todayDate;
  }

  selectedDate = dateString;

  const date = stringToDate(dateString);
  const year = date.getUTCFullYear();
  const month = pad(date.getUTCMonth() + 1);
  const day = pad(date.getUTCDate());

  showScheduleLoading();
  resetPrayerCards();

  const url = `https://api.myquran.com/v2/sholat/jadwal/${CITY_ID}/${year}/${month}/${day}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}`);
    }

    const result = await response.json();

    if (!result.data || !result.data.jadwal) {
      throw new Error("Format data API tidak valid.");
    }

    prayerSchedule = result.data.jadwal;

    updatePrayerElement("subuh", prayerSchedule.subuh);
    updatePrayerElement("dzuhur", prayerSchedule.dzuhur);
    updatePrayerElement("ashar", prayerSchedule.ashar);
    updatePrayerElement("maghrib", prayerSchedule.maghrib);
    updatePrayerElement("isya", prayerSchedule.isya);

    updateScheduleDateHeader(dateString, prayerSchedule.date);

    if (isToday(dateString)) {
      updateCountdown(getJakartaTime());
    } else {
      resetPrayerCards();
    }
  } catch (error) {
    console.error("Gagal mengambil jadwal sholat:", error);

    const prayers = ["subuh", "dzuhur", "ashar", "maghrib", "isya"];

    prayers.forEach((prayer) => {
      const element = document.getElementById(`schedule-time-${prayer}`);

      if (element) {
        element.textContent = "--:--";
      }
    });

    if (isToday(dateString)) {
      prayerSchedule = {
        subuh: "04:32",
        dzuhur: "11:52",
        ashar: "15:18",
        maghrib: "17:48",
        isya: "18:58",
      };

      updatePrayerElement("subuh", prayerSchedule.subuh);
      updatePrayerElement("dzuhur", prayerSchedule.dzuhur);
      updatePrayerElement("ashar", prayerSchedule.ashar);
      updatePrayerElement("maghrib", prayerSchedule.maghrib);
      updatePrayerElement("isya", prayerSchedule.isya);

      updateCountdown(getJakartaTime());
    }
  } finally {
    isLoadingSchedule = false;
  }
}

/* =========================================================
   NAVIGASI TANGGAL
========================================================= */

function changeScheduleDate(amount) {
  const currentDate = stringToDate(selectedDate);
  currentDate.setUTCDate(currentDate.getUTCDate() + amount);
  const newDate = dateToString(currentDate);

  loadPrayerSchedule(newDate);
}

/* =========================================================
   TOMBOL PREV / NEXT / HARI INI
========================================================= */

function setupDateNavigation() {
  const prevButton = document.getElementById("prev-day");
  const nextButton = document.getElementById("next-day");

  if (prevButton) {
    prevButton.addEventListener("click", () => {
      changeScheduleDate(-1);
    });
  }

  if (nextButton) {
    nextButton.addEventListener("click", () => {
      changeScheduleDate(1);
    });
  }

  const todayButton = document.querySelector("#prev-day + span");

  if (todayButton) {
    todayButton.style.cursor = "pointer";

    todayButton.addEventListener("click", () => {
      loadPrayerSchedule(todayDate);
    });
  }
}

/* =========================================================
   NAVBAR
========================================================= */

function setupNavbar() {
  const navbar = document.getElementById("navbar");

  window.addEventListener("scroll", () => {
    if (!navbar) {
      return;
    }

    if (window.scrollY > 80) {
      navbar.classList.add("navbar-scrolled");
    } else {
      navbar.classList.remove("navbar-scrolled");
    }
  });
}

/* =========================================================
   MOBILE MENU
========================================================= */

function setupMobileMenu() {
  const mobileMenuBtn = document.getElementById("mobile-menu-btn");
  const mobileMenu = document.getElementById("mobile-menu");
  const mobileMenuClose = document.getElementById("mobile-menu-close");
  const mobileLinks = document.querySelectorAll(".mobile-link");

  if (!mobileMenuBtn || !mobileMenu) {
    console.warn("Elemen mobile menu tidak ditemukan.");
    return;
  }

  function openMobileMenu() {
    mobileMenu.classList.remove("translate-x-full");
    mobileMenu.classList.add("translate-x-0");
    document.body.classList.add("overflow-hidden");
  }

  function closeMobileMenu() {
    mobileMenu.classList.remove("translate-x-0");
    mobileMenu.classList.add("translate-x-full");
    document.body.classList.remove("overflow-hidden");
  }

  mobileMenuBtn.addEventListener("click", openMobileMenu);

  if (mobileMenuClose) {
    mobileMenuClose.addEventListener("click", closeMobileMenu);
  }

  mobileLinks.forEach((link) => {
    link.addEventListener("click", closeMobileMenu);
  });
}

function setupActiveNavigation() {
  // 1. Ambil SEMUA link: menu desktop, menu mobile, DAN menu di dalam dropdown
  const navLinks = document.querySelectorAll(".nav-link, .mobile-link, .group .absolute a");
  
  // Ambil tombol parent "Jadwal" agar warnanya bisa ikut berubah
  const dropdownParentBtn = document.querySelector(".group button");

  const targetIds = new Set();
  navLinks.forEach(link => {
    const href = link.getAttribute("href");
    if (href && href.startsWith("#") && href.length > 1) {
      targetIds.add(href);
    }
  });

  const sections = [];
  targetIds.forEach(id => {
    const element = document.querySelector(id);
    if (element) sections.push(element);
  });

  if (!sections.length) return;

  function setActiveLink(id) {
    let isDropdownChildActive = false;

    navLinks.forEach((link) => {
      const isActive = link.getAttribute("href") === `#${id}`;
      
      // Toggle status class 'active'
      link.classList.toggle("active", isActive);

      // Manipulasi warna Tailwind secara manual
      if (isActive) {
        link.classList.add("text-amber-300");
        link.classList.remove("text-white", "text-emerald-100");
        
        // Deteksi jika yang sedang aktif adalah menu di dalam dropdown
        if (link.closest('.group .absolute')) {
          isDropdownChildActive = true;
        }
      } else {
        link.classList.remove("text-amber-300");
        // Kembalikan ke warna asli: emerald-100 untuk dropdown, white untuk sisanya
        if (link.closest('.group .absolute')) {
          link.classList.add("text-emerald-100");
        } else {
          link.classList.add("text-white");
        }
      }
    });

    // 2. Logika untuk membuat tombol induk "Jadwal" ikut menyala
    if (dropdownParentBtn) {
      if (isDropdownChildActive) {
        dropdownParentBtn.classList.add("text-amber-300");
        dropdownParentBtn.classList.remove("text-white");
      } else {
        dropdownParentBtn.classList.remove("text-amber-300");
        dropdownParentBtn.classList.add("text-white");
      }
    }
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveLink(entry.target.id);
        }
      });
    },
    {
      root: null,
      threshold: 0.1,
      rootMargin: "-80px 0px -30% 0px",
    }
  );

  sections.forEach((section) => {
    observer.observe(section);
  });

  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      const targetId = link.getAttribute("href");
      if (targetId && targetId.startsWith("#")) {
        setActiveLink(targetId.substring(1));
      }
    });
  });
}

/* =========================================================
   ADZAN TOGGLE
========================================================= */

function setupAdzanToggle() {
  const adzanToggle = document.getElementById("adzan-toggle");
  const adzanStatus = document.getElementById("adzan-status");

  if (!adzanToggle) {
    return;
  }

  adzanToggle.addEventListener("change", async () => {
    if (adzanToggle.checked) {
      if ("Notification" in window) {
        if (Notification.permission === "default") {
          await Notification.requestPermission();
        }
      }

      if (adzanStatus) {
        adzanStatus.textContent = "Aktif";
        adzanStatus.classList.remove("text-emerald-700");
        adzanStatus.classList.add("text-emerald-600");
      }
    } else {
      if (adzanStatus) {
        adzanStatus.textContent = "Nonaktif";
        adzanStatus.classList.remove("text-emerald-600");
        adzanStatus.classList.add("text-emerald-700");
      }
    }
  });
}

/* =========================================================
   DONASI
========================================================= */

const DONATION_WHATSAPP = "6285184000766";
const MIN_DONATION = 50000;
const MAX_DONATION = 3000000;

const donateBtn = document.getElementById("donate-now-btn");
const donationModal = document.getElementById("donation-modal");
const closeDonationBtn = document.getElementById("close-donation-modal");
const confirmDonationBtn = document.getElementById("donation-confirm-btn");
const modalCategory = document.getElementById("modal-donation-category");
const modalAmount = document.getElementById("modal-donation-amount");

let selectedCategory = "Pembangunan";
let selectedNominal = 0;

/* =========================================================
   DONASI - FIX SELEKSI KATEGORI
========================================================= */
const categoryBtns = document.querySelectorAll(".donation-category-btn");

categoryBtns.forEach((button) => {
  button.addEventListener("click", function () {
    // 1. Reset SEMUA tombol ke tampilan default/inactive
    categoryBtns.forEach((btn) => {
      btn.classList.remove(
        "active",
        "border-emerald-500",
        "border-amber-400",
        "border-teal-400",
        "bg-emerald-50/50",
        "bg-amber-50/50",
        "bg-teal-50/50"
      );
      // Buat border default abu-abu netral / transparan
      btn.classList.add("border-slate-200", "bg-white");
    });

    // 2. Tambahkan class aktif & style khusus ke tombol yang sedang diklik
    this.classList.add("active");
    this.classList.remove("border-slate-200", "bg-white");

    const category = this.dataset.category;

    if (category === "pembangunan") {
      selectedCategory = "Pembangunan";
      this.classList.add("border-emerald-500", "bg-emerald-50/50");
    } else if (category === "kegiatan") {
      selectedCategory = "Kegiatan Dakwah";
      this.classList.add("border-amber-400", "bg-amber-50/50");
    } else if (category === "sosial") {
      selectedCategory = "Program Sosial";
      this.classList.add("border-teal-400", "bg-teal-50/50");
    }
  });
});
const nominalBtns = document.querySelectorAll(".nominal-btn");
const customNominal = document.getElementById("custom-nominal");

nominalBtns.forEach((button) => {
  button.addEventListener("click", function () {
    nominalBtns.forEach((btn) => {
      btn.classList.remove("selected");
    });

    this.classList.add("selected");

    const nominal = Number(this.dataset.nominal);

    if (!Number.isNaN(nominal)) {
      selectedNominal = nominal;
    }

    if (customNominal) {
      customNominal.value = selectedNominal;
    }
  });
});

if (customNominal) {
  customNominal.addEventListener("input", function () {
    let value = Number(this.value) || 0;

    if (value > MAX_DONATION) {
      value = MAX_DONATION;
      this.value = MAX_DONATION;
    }

    selectedNominal = value;

    nominalBtns.forEach((btn) => {
      btn.classList.remove("selected");
    });
  });
}

if (donateBtn && donationModal) {
  donateBtn.addEventListener("click", function () {
    if (selectedNominal <= 0) {
      alert("Silakan pilih nominal donasi terlebih dahulu.");
      return;
    }

    if (selectedNominal < MIN_DONATION) {
      alert("Minimal donasi adalah Rp50.000.");
      return;
    }

    if (selectedNominal > MAX_DONATION) {
      alert("Maksimal donasi adalah Rp3.000.000.");
      return;
    }

    const formattedAmount = selectedNominal.toLocaleString("id-ID");

    if (modalCategory) {
      modalCategory.textContent = selectedCategory;
    }

    if (modalAmount) {
      modalAmount.textContent = "Rp" + formattedAmount;
    }

    donationModal.classList.remove("hidden");
    donationModal.classList.add("flex");
    document.body.classList.add("overflow-hidden");
  });
}

function closeDonationModal() {
  if (!donationModal) {
    return;
  }

  donationModal.classList.add("hidden");
  donationModal.classList.remove("flex");
  document.body.classList.remove("overflow-hidden");
}

if (closeDonationBtn) {
  closeDonationBtn.addEventListener("click", closeDonationModal);
}

if (donationModal) {
  donationModal.addEventListener("click", function (event) {
    if (event.target === donationModal) {
      closeDonationModal();
    }
  });
}

document.addEventListener("keydown", function (event) {
  if (event.key === "Escape") {
    if (donationModal && !donationModal.classList.contains("hidden")) {
      closeDonationModal();
    }
  }
});

if (confirmDonationBtn) {
  confirmDonationBtn.addEventListener("click", function () {
    const formattedAmount = selectedNominal.toLocaleString("id-ID");

    const message =
      `Assalamu'alaikum Admin Masjid An-Nuur.\n\n` +
      `Saya sudah berdonasi melalui QRIS.\n\n` +
      `Tujuan donasi: ${selectedCategory}\n` +
      `Nominal: Rp${formattedAmount}\n\n` +
      `Mohon dicatat sebagai donasi untuk Masjid An-Nuur.\n\n` +
      `Terima kasih. Jazakallahu khairan.`;

    const whatsappURL =
      "https://wa.me/" +
      DONATION_WHATSAPP +
      "?text=" +
      encodeURIComponent(message);

    window.open(whatsappURL, "_blank");
  });
}

/* =========================================================
   FILTER AGENDA (AUTOSWAP WARNA TEKS & IKON)
========================================================= */

function setupAgendaFilter() {
  const filterTabs = document.querySelectorAll(".filter-tab");
  const agendaCards = document.querySelectorAll(".agenda-card");

  filterTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      // 1. Reset semua tombol ke tampilan inactive (background putih, teks slate)
      filterTabs.forEach((t) => {
        t.classList.remove("active", "bg-emerald-700", "text-white");
        t.classList.add("bg-white", "text-slate-700");

        // Kembalikan warna ikon tombol lain ke hijau
        const icon = t.querySelector("i");
        if (icon) {
          icon.classList.remove("text-white");
          icon.classList.add("text-emerald-600");
        }
      });

      // 2. Set tombol yang sedang diklik ke tampilan active (background emerald, teks putih)
      tab.classList.add("active", "bg-emerald-700", "text-white");
      tab.classList.remove("bg-white", "text-slate-700");

      // Ubah warna ikon pada tombol aktif menjadi putih
      const activeIcon = tab.querySelector("i");
      if (activeIcon) {
        activeIcon.classList.remove("text-emerald-600");
        activeIcon.classList.add("text-white");
      }

      // 3. Filter Card Agenda
      const filter = tab.dataset.filter;

      agendaCards.forEach((card) => {
        const category = card.dataset.category;

        if (filter === "all" || category === filter) {
          card.style.display = "block";
        } else {
          card.style.display = "none";
        }
      });
    });
  });
}

/* =========================================================
   SCROLL REVEAL
========================================================= */

function setupScrollReveal() {
  if (!("IntersectionObserver" in window)) {
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("section-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.1,
    },
  );

  document.querySelectorAll("section:not(#home)").forEach((section) => {
    section.classList.add("section-hidden");
    observer.observe(section);
  });
}

/* =========================================================
   DOM CONTENT LOADED
========================================================= */

document.addEventListener("anNurComponentsLoaded", () => {
  console.log("Website Masjid An-Nur berhasil dijalankan.");

  const now = getJakartaTime();
  todayDate = dateToString(now);
  selectedDate = todayDate;

  updateClock();
  updateHeroBackground();
  lastBackgroundHour = now.getUTCHours();

  setupNavbar();
  setupMobileMenu();
  setupDateNavigation();
  setupAdzanToggle();
  setupActiveNavigation();
  setupAgendaFilter();
  setupScrollReveal();

  function setupDonationBackButton() {
    const donationModal = document.getElementById("donation-modal");
    const backButton = document.getElementById("back-donation-modal");

    if (!donationModal || !backButton) {
      return;
    }

    backButton.addEventListener("click", function () {
      donationModal.classList.add("hidden");
      donationModal.classList.remove("flex");
      document.body.classList.remove("overflow-hidden");
    });
  }
  setupDonationBackButton();

  loadPrayerSchedule(todayDate);

  setInterval(updateClock, 1000);
  setInterval(checkBackgroundTime, 1000);
});

/* =========================================================
   FIX NOMINAL DONASI
   ========================================================= */

document.addEventListener("click", function (event) {
  const button = event.target.closest(".nominal-btn");

  if (!button) {
    return;
  }

  const nominal = Number(button.dataset.nominal);

  if (Number.isNaN(nominal) || nominal <= 0) {
    return;
  }

  window.selectedDonationNominal = nominal;

  document.querySelectorAll(".nominal-btn").forEach(function (btn) {
    btn.classList.remove("selected");
  });

  button.classList.add("selected");

  const input = document.getElementById("custom-nominal");

  if (input) {
    input.value = nominal.toLocaleString("id-ID");
  }
});

/* =========================================================
   FIX TOMBOL DONASI
   ========================================================= */

document.addEventListener("click", function (event) {
  const button = event.target.closest("#donate-now-btn");

  if (!button) {
    return;
  }

  const nominal = window.selectedDonationNominal || 0;

  if (nominal < 50000) {
    alert("Silakan pilih nominal donasi minimal Rp50.000.");
    return;
  }

  if (nominal > 3000000) {
    alert("Maksimal donasi adalah Rp3.000.000.");
    return;
  }

  const modal = document.getElementById("donation-modal");
  const modalAmount = document.getElementById("modal-donation-amount");
  const modalCategory = document.getElementById("modal-donation-category");

  if (modalAmount) {
    modalAmount.textContent = "Rp" + nominal.toLocaleString("id-ID");
  }

  const activeCategory = document.querySelector(
    ".donation-category-btn.active",
  );

  if (modalCategory && activeCategory) {
    const category = activeCategory.dataset.category;

    if (category === "pembangunan") {
      modalCategory.textContent = "Pembangunan";
    } else if (category === "kegiatan") {
      modalCategory.textContent = "Kegiatan Dakwah";
    } else if (category === "sosial") {
      modalCategory.textContent = "Program Sosial";
    }
  }

  if (modal) {
    modal.classList.remove("hidden");
    modal.classList.add("flex");
    document.body.classList.add("overflow-hidden");
  }
});


