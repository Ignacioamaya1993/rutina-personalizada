import { db } from "./firebaseConfig.js";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  where,
  serverTimestamp,
  updateDoc,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* ==============================
   ELEMENTOS
================================ */
const inputEjercicio = document.getElementById("nuevoEjercicio");
const btnAgregarEjercicio = document.getElementById("btnAgregarEjercicio");
const listaEjercicios = document.getElementById("listaEjercicios");
const rutinaContainer = document.getElementById("rutina");
const daysTabs = document.getElementById("daysTabs");

const modal = document.getElementById("modalHistorial");
const cerrarModal = document.getElementById("cerrarModal");
const modalTitulo = document.getElementById("modalTitulo");
const ctx = document.getElementById("graficoPeso");

const dias = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
let diaActivo = "Lunes";
let chartInstance = null;

/* ==============================
   ALTA EJERCICIOS
================================ */
btnAgregarEjercicio.addEventListener("click", async () => {
  const nombre = inputEjercicio.value.trim();
  if (!nombre) return alert("Ingresá un nombre");

  await addDoc(collection(db, "ejercicios"), {
    nombre,
    creadoEn: serverTimestamp()
  });

  inputEjercicio.value = "";
  cargarEjercicios();
});

/* ==============================
   MODAL
================================ */
cerrarModal.addEventListener("click", () => {
  modal.classList.add("hidden");
  if (chartInstance) chartInstance.destroy();
});

/* ==============================
   TABS
================================ */
dias.forEach(dia => {
  const tab = document.createElement("div");
  tab.className = "day-tab";
  tab.textContent = dia;

  if (dia === diaActivo) tab.classList.add("active");

  tab.addEventListener("click", () => {
    document.querySelector(".day-tab.active")?.classList.remove("active");
    tab.classList.add("active");
    diaActivo = dia;
    cargarRutina();
  });

  daysTabs.appendChild(tab);
});

/* ==============================
   CARGAR RUTINA
================================ */
async function cargarRutina() {
  rutinaContainer.innerHTML = "";

  const q = query(
    collection(db, "rutina"),
    where("dia", "==", diaActivo)
  );

  const snap = await getDocs(q);

  snap.forEach(docSnap => {
    const data = docSnap.data();

    const card = document.createElement("div");
    card.className = "exercise-card";

    card.innerHTML = `
      <div class="exercise-header">
        <span class="exercise-name">${data.nombre}</span>
      </div>

      <div class="exercise-inputs">
        <input type="number" class="input-series" value="${data.series}">
        <input type="number" class="input-reps" value="${data.repeticiones}">
        <input type="number" class="input-peso" placeholder="Peso (kg)">
      </div>

      <div class="exercise-actions">
        <button class="btn-save">Guardar</button>
        <button class="btn-peso">Registrar peso</button>
        <button class="btn-history">📈 Historial</button>
        <button class="btn-edit">Eliminar</button>
      </div>
    `;

    const inputSeries = card.querySelector(".input-series");
    const inputReps = card.querySelector(".input-reps");
    const inputPeso = card.querySelector(".input-peso");
    const btnSave = card.querySelector(".btn-save");

    /* 💾 GUARDAR SERIES / REPS */
    btnSave.addEventListener("click", async () => {
      await updateDoc(doc(db, "rutina", docSnap.id), {
        series: Number(inputSeries.value),
        repeticiones: Number(inputReps.value),
        actualizadoEn: serverTimestamp()
      });

      btnSave.textContent = "✔ Guardado";
      setTimeout(() => (btnSave.textContent = "Guardar"), 1000);
    });

    /* 🏋️ REGISTRAR PESO */
    card.querySelector(".btn-peso").addEventListener("click", async () => {
      const peso = Number(inputPeso.value);
      if (!peso) return alert("Ingresá un peso válido");

      await addDoc(
        collection(db, "rutina", docSnap.id, "historial"),
        {
          fecha: serverTimestamp(),
          peso,
          series: Number(inputSeries.value),
          repeticiones: Number(inputReps.value)
        }
      );

      inputPeso.value = "";
      alert("Peso registrado 💪");
    });

    /* 📈 HISTORIAL */
    card.querySelector(".btn-history").addEventListener("click", async () => {
      modal.classList.remove("hidden");
      modalTitulo.textContent = data.nombre;

      const snapHistorial = await getDocs(
        query(
          collection(db, "rutina", docSnap.id, "historial"),
          orderBy("fecha")
        )
      );

      const fechas = [];
      const pesos = [];

      snapHistorial.forEach(h => {
        const d = h.data();
        fechas.push(d.fecha.toDate().toLocaleDateString());
        pesos.push(d.peso);
      });

      if (chartInstance) chartInstance.destroy();

      chartInstance = new Chart(ctx, {
        type: "line",
        data: {
          labels: fechas,
          datasets: [{
            label: "Peso (kg)",
            data: pesos,
            tension: 0.3
          }]
        }
      });
    });

    /* ❌ ELIMINAR */
    card.querySelector(".btn-edit").addEventListener("click", async () => {
      if (!confirm("¿Eliminar ejercicio de la rutina?")) return;
      await deleteDoc(doc(db, "rutina", docSnap.id));
      cargarRutina();
    });

    rutinaContainer.appendChild(card);
  });
}

/* ==============================
   LISTA DE EJERCICIOS
================================ */
async function cargarEjercicios() {
  listaEjercicios.innerHTML = "";

  const snap = await getDocs(collection(db, "ejercicios"));

  snap.forEach(docSnap => {
    const ejercicio = docSnap.data();

    const div = document.createElement("div");
    div.className = "ejercicio-item";

    div.innerHTML = `
      <span>${ejercicio.nombre}</span>
      <button class="btn-add">➕ Rutina</button>
    `;

    div.querySelector(".btn-add").addEventListener("click", async () => {
      const series = prompt("Series:");
      const reps = prompt("Repeticiones:");
      if (!series || !reps) return;

      const q = query(
        collection(db, "rutina"),
        where("dia", "==", diaActivo),
        where("ejercicioId", "==", docSnap.id)
      );

      const existente = await getDocs(q);

      if (!existente.empty) {
        alert("ℹ️ Este ejercicio ya está agregado en este día");
        return;
      }

      await addDoc(collection(db, "rutina"), {
        dia: diaActivo,
        ejercicioId: docSnap.id,
        nombre: ejercicio.nombre,
        series: Number(series),
        repeticiones: Number(reps),
        creadoEn: serverTimestamp()
      });

      cargarRutina();
    });

    listaEjercicios.appendChild(div);
  });
}

/* ==============================
   INIT
================================ */
cargarEjercicios();
cargarRutina();
