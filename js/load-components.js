/* =========================================================
   COMPONENT LOADER - REMAJA MASJID AN-NUR
   Memuat setiap bagian HTML secara terpisah.
   ========================================================= */

const components = [
  ["component-navbar", "components/navbar.html"],
  ["component-home", "components/home.html"],
  ["component-jadwal", "components/jadwal.html"],
  ["component-donasi", "components/donasi.html"],
  ["component-agenda", "components/agenda.html"],
  ["component-laporan", "components/laporan.html"],
  ["component-lokasi", "components/lokasi.html"],
  ["component-donation-modal", "components/donation-modal.html"],
];

async function loadComponent(targetId, filePath) {
  const target = document.getElementById(targetId);
  if (!target) throw new Error(`Container #${targetId} tidak ditemukan.`);

  const response = await fetch(filePath);
  if (!response.ok) {
    throw new Error(`Gagal memuat ${filePath}: HTTP ${response.status}`);
  }

  target.innerHTML = await response.text();
}

async function loadAllComponents() {
  try {
    await Promise.all(components.map(([id, path]) => loadComponent(id, path)));
    console.log("Semua komponen HTML berhasil dimuat.");

    const script = document.createElement("script");
    script.src = "js/script.js";
    script.onload = () => {
      console.log("Main JavaScript berhasil dimuat.");
      document.dispatchEvent(new Event("anNurComponentsLoaded"));
    };
    script.onerror = () => console.error("Gagal memuat js/script.js");
    document.body.appendChild(script);
  } catch (error) {
    console.error("Gagal memuat komponen website:", error);
  }
}

loadAllComponents();
