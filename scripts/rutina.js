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
   UTILIDADES
================================ */
function obtenerDiaActual() {
  const hoy = new Date().getDay();
  const mapa = {
    1: "Lunes",
    2: "Martes",
    3: "Miércoles",
    4: "Jueves",
    5: "Viernes",
    6: "Sábado",
    0: "Lunes"
  };
  return mapa[hoy];
}

/* ==============================
   ELEMENTOS
================================ */
const inputEjercicio = document.getElementById("nuevoEjercicio");
const btnCrearEjercicio = document.getElementById("btnCrearEjercicio");
const listaEjercicios = document.getElementById("listaEjercicios");
const rutinaContainer = document.getElementById("rutina");
const daysTabs = document.getElementById("daysTabs");

const modal = document.getElementById("modalHistorial");
const cerrarModal = document.getElementById("cerrarModal");
const modalTitulo = document.getElementById("modalTitulo");
const tipoGrafico = document.getElementById("tipoGrafico");
const ctx = document.getElementById("graficoPeso");

const dias = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
let diaActivo = obtenerDiaActual();
let chartInstance = null;

/* ==============================
   CREAR EJERCICIO
================================ */
btnCrearEjercicio.addEventListener("click", async () => {
  const nombre = inputEjercicio.value.trim();

  if (!nombre) {
    Swal.fire("Falta el nombre", "", "warning");
    return;
  }

  await addDoc(collection(db, "ejercicios"), {
    nombre,
    creadoEn: serverTimestamp()
  });

  inputEjercicio.value = "";
  Swal.fire("Ejercicio creado", "", "success");
  cargarEjercicios();
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
   RUTINA
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
      <h4>${data.nombre}</h4>

      <div class="exercise-inputs">
        <input type="number" class="input-series" value="${data.series}">
        <input type="number" class="input-reps" value="${data.repeticiones}">
        <input
          type="number"
          class="input-peso"
          placeholder="Peso"
          value="${data.ultimoPeso ?? ''}"
        >

        <input
          type="number"
          class="input-pr"
          placeholder="PR"
          value="${data.ultimoPR ?? ''}"
        >

      </div>

      <div class="exercise-actions">
        <button class="btn-save">Guardar</button>
        <button class="btn-peso">Registrar</button>
        <button class="btn-history">📈 Historial</button>
        <button class="btn-edit">Eliminar</button>
      </div>
    `;

    const series = card.querySelector(".input-series");
    const reps = card.querySelector(".input-reps");
    const peso = card.querySelector(".input-peso");
    const pr = card.querySelector(".input-pr");

    card.querySelector(".btn-save").addEventListener("click", async () => {
      await updateDoc(doc(db, "rutina", docSnap.id), {
        series: Number(series.value),
        repeticiones: Number(reps.value),
        actualizadoEn: serverTimestamp()
      });

      Swal.fire("Guardado", "", "success");
    });

    card.querySelector(".btn-peso").addEventListener("click", async () => {
      if (!peso.value && !pr.value) {
        Swal.fire("Ingresá peso o PR", "", "warning");
        return;
      }

      await addDoc(
        collection(db, "rutina", docSnap.id, "historial"),
        {
          fecha: serverTimestamp(),
          peso: Number(peso.value || 0),
          pr: Number(pr.value || 0),
          series: Number(series.value),
          repeticiones: Number(reps.value)
        }
      );

            await updateDoc(doc(db, "rutina", docSnap.id), {
        ultimoPeso: Number(peso.value || data.ultimoPeso || 0),
        ultimoPR: Number(pr.value || data.ultimoPR || 0),
        actualizadoEn: serverTimestamp()
      });

      peso.value = "";
      pr.value = "";
      Swal.fire("Registro guardado 💪", "", "success");
    });

    card.querySelector(".btn-history").addEventListener("click", async () => {
      modal.classList.remove("hidden");
      modalTitulo.textContent = data.nombre;

      const snapHistorial = await getDocs(
        query(
          collection(db, "rutina", docSnap.id, "historial"),
          orderBy("fecha")
        )
      );

      const datos = { peso: [], pr: [], fechas: [] };

      snapHistorial.forEach(h => {
        const d = h.data();
        datos.fechas.push(d.fecha.toDate().toLocaleDateString());
        datos.peso.push(d.peso);
        datos.pr.push(d.pr);
      });

      renderGrafico(datos);
    });

    card.querySelector(".btn-edit").addEventListener("click", async () => {
      const res = await Swal.fire({
        title: "Eliminar ejercicio",
        showCancelButton: true,
        confirmButtonText: "Eliminar"
      });

      if (res.isConfirmed) {
        await deleteDoc(doc(db, "rutina", docSnap.id));
        cargarRutina();
      }
    });

    rutinaContainer.appendChild(card);
  });
}

/* ==============================
   GRÁFICO
================================ */
function renderGrafico(datos) {
  if (chartInstance) chartInstance.destroy();

  const tipo = tipoGrafico.value;

  chartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: datos.fechas,
      datasets: [{
        label: tipo === "peso" ? "Peso (kg)" : "PR",
        data: datos[tipo],
        tension: 0.3
      }]
    }
  });
}

tipoGrafico.addEventListener("change", () => {
  if (chartInstance) chartInstance.destroy();
});

/* ==============================
   EJERCICIOS
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
      const { value: form } = await Swal.fire({
        title: "Agregar a rutina",
        html: `
          <input id="s" class="swal2-input" placeholder="Series">
          <input id="r" class="swal2-input" placeholder="Reps">
          <input id="p" class="swal2-input" placeholder="Peso">
          <input id="pr" class="swal2-input" placeholder="PR">
        `,
        preConfirm: () => ({
          series: document.getElementById("s").value,
          reps: document.getElementById("r").value,
          peso: document.getElementById("p").value,
          pr: document.getElementById("pr").value
        })
      });

      if (!form) return;

      const ref = await addDoc(collection(db, "rutina"), {
        dia: diaActivo,
        ejercicioId: docSnap.id,
        nombre: ejercicio.nombre,
        series: Number(form.series),
        repeticiones: Number(form.reps),
        ultimoPeso: Number(form.peso || 0),
        ultimoPR: Number(form.pr || 0),
        creadoEn: serverTimestamp()
      });

      await addDoc(
        collection(db, "rutina", ref.id, "historial"),
        {
          fecha: serverTimestamp(),
          peso: Number(form.peso || 0),
          pr: Number(form.pr || 0),
          series: Number(form.series),
          repeticiones: Number(form.reps)
        }
      );

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