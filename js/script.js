const malls = [
    { id: "cp", name: "Centre Point Medan" },
    { id: "dp", name: "Delipark Medan" },
    { id: "sp", name: "Sun Plaza" },
    { id: "mf", name: "Plaza Medan Fair" },
    { id: "cc", name: "Cambridge City Square" },
];

const movies = [
    { id: 1, title: "Avengers End Game", img: "Img/Avengers End Game.jpeg" },
    { id: 2, title: "Zootopia 2", img: "Img/Zootopia 2.jpeg" },
    { id: 3, title: "The Conjuring", img: "Img/The Conjuring.jpeg" },
    { id: 4, title: "Insidious", img: "Img/Insidious.jpeg" },
    { id: 5, title: "Mufasa", img: "Img/Mufasa.jpeg" },
    { id: 6, title: "Super Mario", img: "Img/Super Mario.jpeg" },
];

const showtimes = ["10:00", "13:00", "16:00", "19:00", "22:00"];
const PRICE_PER_SEAT = 50000;   
const ROWS = 8;
const COLS = 10;
const ROW_LABELS = "ABCDEFGH";

let state = {
    customerName: "",
    selectedMall: null,
    selectedMovie: null,
    selectedTime: null,
    selectedSeats: [],
};

let bookings = [];
let bookingIdCounter = 1;

// Kursi terpesan dihitung per pertunjukan (mall + film + jam).
// Sumber kebenaran tunggal: daftar `bookings`.
let bookedSeatsByScreening = {};

function screeningKey(mallId, movieId, time) {
    return `${mallId}|${movieId}|${time}`;
}

function rebuildBookedSeats() {
    bookedSeatsByScreening = {};
    bookings.forEach((b) => {
        if (b.mallId == null || b.movieId == null || !b.seatKeys) return;
        const key = screeningKey(b.mallId, b.movieId, b.time);
        if (!bookedSeatsByScreening[key]) bookedSeatsByScreening[key] = new Set();
        b.seatKeys.forEach((sk) => bookedSeatsByScreening[key].add(sk));
    });
}

function getCurrentBookedSeats() {
    if (!state.selectedMall || !state.selectedMovie || !state.selectedTime) {
        return new Set();
    }
    const key = screeningKey(state.selectedMall.id, state.selectedMovie.id, state.selectedTime);
    return bookedSeatsByScreening[key] || new Set();
}

function saveToStorage() {
    localStorage.setItem("stix_bookings", JSON.stringify(bookings));
    localStorage.setItem("stix_counter", bookingIdCounter);
}

function loadFromStorage() {
    const saved = localStorage.getItem("stix_bookings");
    if (saved) bookings = JSON.parse(saved);

    const counter = localStorage.getItem("stix_counter");
    if (counter) bookingIdCounter = parseInt(counter);

    rebuildBookedSeats();
}

document.addEventListener("DOMContentLoaded", () => {
    loadFromStorage();
    renderBookingSteps();
    renderTable();
});

function renderBookingSteps() {
    const container = document.getElementById("bookingSteps");
    if (!container) return;
    container.innerHTML = "";

    const namaGroup = document.createElement("div");
    namaGroup.className = "field-group";
    namaGroup.innerHTML = `
        <label class="field-label" for="inputName">Nama Pemesan <span class="required-star">*</span></label>
        <input type="text" id="inputName" class="field-input" placeholder="Masukkan nama kamu" value="${state.customerName}" autocomplete="name" maxlength="40">
        <small class="field-hint">Huruf saja, tanpa angka atau simbol.</small>
    `;
    container.appendChild(namaGroup);

    const mallGroup = document.createElement("div");
    mallGroup.className = "field-group";
    let mallOpts = `<option value="">-- Pilih Mall --</option>`;
    malls.forEach((m) => {
        const sel = state.selectedMall?.id === m.id ? " selected" : "";
        mallOpts += `<option value="${m.id}"${sel}>${m.name}</option>`;
    });
    mallGroup.innerHTML = `
        <label class="field-label" for="selectMall">Pilih Mall <span class="required-star">*</span></label>
        <select id="selectMall" class="field-select">${mallOpts}</select>
    `;
    container.appendChild(mallGroup);

    const filmGroup = document.createElement("div");
    filmGroup.className = "field-group";
    filmGroup.innerHTML = `
        <label class="field-label">Pilih Film <span class="required-star">*</span></label>
        <div class="movie-options" id="movieOptions"></div>
        <small class="field-hint" id="movieHint">Pilih mall terlebih dahulu</small>
    `;
    container.appendChild(filmGroup);

    const timeGroup = document.createElement("div");
    timeGroup.className = "field-group";
    timeGroup.innerHTML = `
        <label class="field-label">Pilih Jam Tayang <span class="required-star">*</span></label>
        <div class="time-options" id="timeOptions"></div>
        <small class="field-hint" id="timeHint">Pilih film terlebih dahulu</small>
    `;
    container.appendChild(timeGroup);

    const seatGroup = document.createElement("div");
    seatGroup.className = "field-group";
    seatGroup.innerHTML = `
        <label class="field-label">Pilih Kursi <span class="required-star">*</span></label>
        <div class="cinema-layout">
            <div class="screen">LAYAR</div>
            <div class="seat-grid" id="seatGrid"></div>
            <div class="seat-legend">
                <span><span class="seat-demo available"></span> Tersedia</span>
                <span><span class="seat-demo selected"></span> Dipilih</span>
                <span><span class="seat-demo booked"></span> Terisi</span>
            </div>
        </div>
        <small class="field-hint" id="seatHint">Pilih jam terlebih dahulu</small>
        <div class="seat-info" id="seatInfo">Belum ada kursi dipilih</div>
    `;
    container.appendChild(seatGroup);

    const submitGroup = document.createElement("div");
    submitGroup.className = "field-group submit-area";
    submitGroup.innerHTML = `
        <div class="booking-summary" id="bookingSummary">
            <p>Silakan lengkapi semua data di atas.</p>
        </div>
        <button type="submit" class="confirm-btn" id="confirmBtn" disabled>
            Pesan Tiket
        </button>
    `;
    container.appendChild(submitGroup);

    const nameInput = document.getElementById("inputName");
    if (nameInput) {
        nameInput.addEventListener("input", (e) => {
            const filtered = e.target.value.replace(/[^a-zA-Z\s]/g, "");
            if (filtered !== e.target.value) {
                e.target.value = filtered;
            }
            state.customerName = filtered.trim();
            hideError();
            updateSummary();
        });
    }

    const mallSelect = document.getElementById("selectMall");
    if (mallSelect) {
        mallSelect.addEventListener("change", (e) => {
            const mall = malls.find((m) => m.id === e.target.value);
            if (mall) {
                state.selectedMall = mall;
                state.selectedMovie = null;
                state.selectedTime = null;
                state.selectedSeats = [];
            } else {
                state.selectedMall = null;
                state.selectedMovie = null;
                state.selectedTime = null;
                state.selectedSeats = [];
            }
            hideError();
            renderMovieOptions();
            renderTimeOptions();
            renderSeatGrid();
            updateSummary();
        });
    }

    renderMovieOptions();
    renderTimeOptions();
    renderSeatGrid();
    updateSummary();
}

function selectMovie(movie) {
    state.selectedMovie = movie;
    state.selectedSeats = [];
    hideError();
    renderMovieOptions();
    renderTimeOptions();
    renderSeatGrid();
    updateSummary();
    document.getElementById("timeOptions")?.scrollIntoView({ behavior: "smooth" });
}

function selectTime(time) {
    state.selectedTime = time;
    state.selectedSeats = [];
    hideError();
    renderTimeOptions();
    renderSeatGrid();
    updateSummary();
    document.getElementById("seatGrid")?.scrollIntoView({ behavior: "smooth" });
}

function toggleSeat(row, col) {
    const key = `${row}-${col}`;
    if (getCurrentBookedSeats().has(key)) return;

    const idx = state.selectedSeats.findIndex((s) => s.row === row && s.col === col);
    if (idx > -1) {
        state.selectedSeats.splice(idx, 1);
    } else {
        state.selectedSeats.push({ row, col });
    }
    hideError();
    renderSeatGrid();
    updateSummary();
}

function renderMovieOptions() {
    const container = document.getElementById("movieOptions");
    const hint = document.getElementById("movieHint");
    if (!container) return;

    container.innerHTML = "";
    movies.forEach((movie) => {
        const div = document.createElement("div");
        const disabled = !state.selectedMall;
        div.className = `movie-option${state.selectedMovie?.id === movie.id ? " active" : ""}${disabled ? " disabled" : ""}`;
        div.innerHTML = `<img src="${movie.img}" alt="${movie.title}"><span>${movie.title}</span>`;
        if (!disabled) {
            div.onclick = () => selectMovie(movie);
            div.setAttribute("tabindex", "0");
        }
        container.appendChild(div);
    });

    if (hint) {
        hint.textContent = state.selectedMall
            ? "Klik film yang ingin ditonton"
            : "Pilih mall terlebih dahulu";
    }
}

function renderTimeOptions() {
    const container = document.getElementById("timeOptions");
    const hint = document.getElementById("timeHint");
    if (!container) return;

    container.innerHTML = "";
    showtimes.forEach((time) => {
        const div = document.createElement("div");
        const disabled = !state.selectedMovie;
        div.className = `time-option${state.selectedTime === time ? " active" : ""}${disabled ? " disabled" : ""}`;
        div.textContent = time;
        if (!disabled) {
            div.onclick = () => selectTime(time);
            div.setAttribute("tabindex", "0");
        }
        container.appendChild(div);
    });

    if (hint) {
        hint.textContent = state.selectedMovie
            ? "Klik jam tayang yang diinginkan"
            : "Pilih film terlebih dahulu";
    }
}

function renderSeatGrid() {
    const grid = document.getElementById("seatGrid");
    const hint = document.getElementById("seatHint");
    if (!grid) return;

    grid.innerHTML = "";

    const booked = getCurrentBookedSeats();

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (c === 5) {
                const aisle = document.createElement("div");
                aisle.className = "aisle";
                grid.appendChild(aisle);
            }

            const seat = document.createElement("div");
            const key = `${r}-${c}`;
            const canSelect = !booked.has(key) && !!state.selectedTime;

            seat.className = "seat";

            if (booked.has(key)) {
                seat.classList.add("booked");
            } else if (state.selectedSeats.some((s) => s.row === r && s.col === c)) {
                seat.classList.add("selected");
            } else if (state.selectedTime) {
                seat.classList.add("available");
            } else {
                seat.classList.add("idle");
            }

            seat.textContent = `${ROW_LABELS[r]}${c + 1}`;
            if (canSelect) {
                seat.onclick = () => toggleSeat(r, c);
                seat.setAttribute("tabindex", "0");
            }
            grid.appendChild(seat);
        }
    }

    if (hint) {
        hint.textContent = state.selectedTime
            ? "Klik kursi yang tersedia"
            : "Pilih jam terlebih dahulu";
    }
}

function updateSummary() {
    const summary = document.getElementById("bookingSummary");
    const btn = document.getElementById("confirmBtn");
    if (!summary || !btn) return;

    let html = "";
    let canSubmit = true;

    if (state.customerName) {
        html += `<p><strong>Nama:</strong> ${state.customerName}</p>`;
    } else { canSubmit = false; }

    if (state.selectedMall) {
        html += `<p><strong>Mall:</strong> ${state.selectedMall.name}</p>`;
    } else { canSubmit = false; }

    if (state.selectedMovie) {
        html += `<p><strong>Film:</strong> ${state.selectedMovie.title}</p>`;
    } else { canSubmit = false; }

    if (state.selectedTime) {
        html += `<p><strong>Jam:</strong> ${state.selectedTime}</p>`;
    } else { canSubmit = false; }

    if (state.selectedSeats.length > 0) {
        const seats = state.selectedSeats
            .map((s) => `${ROW_LABELS[s.row]}${s.col + 1}`)
            .join(", ");
        const total = state.selectedSeats.length * PRICE_PER_SEAT;
        html += `<p><strong>Kursi:</strong> ${seats}</p>`;
        html += `<p><strong>Total:</strong> Rp ${total.toLocaleString("id-ID")}</p>`;
    } else {
        canSubmit = false;
    }

    if (!html) {
        html = "<p>Silakan lengkapi semua data di atas.</p>";
    }

    summary.innerHTML = html;
    btn.disabled = !canSubmit;

    const info = document.getElementById("seatInfo");
    if (info) {
        if (state.selectedSeats.length > 0) {
            const seats = state.selectedSeats
                .map((s) => `${ROW_LABELS[s.row]}${s.col + 1}`)
                .join(", ");
            info.textContent = `${state.selectedSeats.length} kursi dipilih: ${seats}`;
            info.style.color = "#4ade80";
        } else {
            info.textContent = "Klik kursi yang tersedia untuk memilih.";
            info.style.color = "";
        }
    }
}

function validateForm() {
    const errorDiv = document.getElementById("formError");
    if (!errorDiv) return true;

    const errors = [];
    if (!state.customerName) errors.push("Isi nama pemesan terlebih dahulu.");
    if (!state.selectedMall) errors.push("Pilih mall terlebih dahulu.");
    if (!state.selectedMovie) errors.push("Pilih film yang ingin ditonton.");
    if (!state.selectedTime) errors.push("Pilih jam tayang.");
    if (state.selectedSeats.length === 0) errors.push("Pilih minimal 1 kursi.");

    if (errors.length > 0) {
        errorDiv.innerHTML = errors.join("<br>");
        errorDiv.style.display = "block";
        errorDiv.scrollIntoView({ behavior: "smooth", block: "center" });
        return false;
    }

    errorDiv.style.display = "none";
    return true;
}

function hideError() {
    const el = document.getElementById("formError");
    if (el) el.style.display = "none";
}

document.addEventListener("submit", (e) => {
    if (e.target.id === "bookingForm") {
        e.preventDefault();
        handleSubmit();
    }
});

function handleSubmit() {
    if (!validateForm()) return;

    // Pengaman: pastikan kursi yang dipilih belum dipesan orang lain
    // untuk pertunjukan (mall + film + jam) yang sama.
    const booked = getCurrentBookedSeats();
    const clash = state.selectedSeats.some((s) => booked.has(`${s.row}-${s.col}`));
    if (clash) {
        state.selectedSeats = state.selectedSeats.filter(
            (s) => !booked.has(`${s.row}-${s.col}`)
        );
        const errorDiv = document.getElementById("formError");
        if (errorDiv) {
            errorDiv.innerHTML =
                "Maaf, sebagian kursi yang kamu pilih sudah dipesan orang lain. Silakan pilih kursi lain.";
            errorDiv.style.display = "block";
        }
        renderSeatGrid();
        updateSummary();
        return;
    }

    const seats = state.selectedSeats
        .map((s) => `${ROW_LABELS[s.row]}${s.col + 1}`)
        .join(", ");

    const seatKeys = state.selectedSeats.map((s) => `${s.row}-${s.col}`);

    const total = state.selectedSeats.length * PRICE_PER_SEAT;

    const newBooking = {
        id: bookingIdCounter++,
        name: state.customerName,
        mallId: state.selectedMall.id,
        mall: state.selectedMall.name,
        movieId: state.selectedMovie.id,
        movie: state.selectedMovie.title,
        time: state.selectedTime,
        seats: seats,
        seatKeys: seatKeys,
        seatCount: state.selectedSeats.length,
        total: total,
    };
    bookings.push(newBooking);
    saveToStorage();
    rebuildBookedSeats();

    state.selectedSeats = [];

    renderTable();
    showSuccessPopup(newBooking);
    resetForm();
}

function resetForm() {
    state.customerName = "";
    state.selectedMall = null;
    state.selectedMovie = null;
    state.selectedTime = null;
    state.selectedSeats = [];

    const nameInput = document.getElementById("inputName");
    if (nameInput) nameInput.value = "";

    const mallSelect = document.getElementById("selectMall");
    if (mallSelect) mallSelect.value = "";

    renderBookingSteps();
    renderSeatGrid();
    updateSummary();
}

function renderTable() {
    const tbody = document.getElementById("tableBody");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (bookings.length === 0) {
        const row = document.createElement("tr");
        row.id = "emptyRow";
        row.innerHTML = `<td colspan="8" class="empty-msg">Belum ada pemesanan. Silakan booking tiket di atas!</td>`;
        tbody.appendChild(row);
        return;
    }

    bookings.forEach((b, index) => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${b.name}</td>
            <td>${b.mall}</td>
            <td>${b.movie}</td>
            <td>${b.time}</td>
            <td>${b.seats}</td>
            <td class="price">Rp ${b.total.toLocaleString("id-ID")}</td>
            <td>
                <button class="delete-btn" data-id="${b.id}" title="Hapus pemesanan">Hapus</button>
            </td>
        `;
        tbody.appendChild(row);
    });

    document.querySelectorAll(".delete-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            const id = parseInt(e.target.dataset.id, 10);
            deleteBooking(id);
        });
    });
}

function deleteBooking(id) {
    const booking = bookings.find((b) => b.id === id);
    if (!booking) return;

    if (!confirm(`Yakin ingin menghapus pemesanan "${booking.movie}" di ${booking.mall}?`)) {
        return;
    }

    bookings = bookings.filter((b) => b.id !== id);
    saveToStorage();
    rebuildBookedSeats();
    renderTable();
}

function showSuccessPopup(booking) {
    const popup = document.getElementById("successPopup");
    const body = document.getElementById("popupBody");
    if (!popup || !body) return;

    body.innerHTML = `
        <p style="font-size:1.1rem;font-weight:700;margin-bottom:12px;">Pemesanan Berhasil!</p>
        <p><strong>Nama:</strong> ${booking.name}</p>
        <p><strong>Mall:</strong> ${booking.mall}</p>
        <p><strong>Film:</strong> ${booking.movie}</p>
        <p><strong>Jam:</strong> ${booking.time}</p>
        <p><strong>Kursi:</strong> ${booking.seats}</p>
        <p><strong>Total:</strong> Rp ${booking.total.toLocaleString("id-ID")}</p>
        <p style="margin-top:12px;opacity:0.7;">Nikmati filmnya!</p>
    `;
    popup.style.display = "flex";
}

function closePopup() {
    const popup = document.getElementById("successPopup");
    if (popup) popup.style.display = "none";
}

document.addEventListener("click", (e) => {
    if (e.target.id === "successPopup") closePopup();
});

// end !!