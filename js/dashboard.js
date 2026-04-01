const API_BASE = "/api";

document.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem("token");
    const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
    if (!token || !loggedInUser) {
        window.location.href = "index.html";
        return;
    }

    const state = {
        tasks: [],
        currentFilter: "all",
        searchQuery: "",
        sortOption: "newest",
        profile: {
            quickNotes: "",
            preferences: { theme: "dark", weatherCity: "London" },
            pomodoro: { duration: 1500, remainingSeconds: 1500, isRunning: false, lastUpdatedAt: null },
        },
    };

    let notesSaveTimer = null;
    let pomodoroInterval = null;

    const ui = {
        userNameDisplay: document.getElementById("userNameDisplay"),
        taskGrid: document.getElementById("taskGrid"),
        taskForm: document.getElementById("taskForm"),
        taskModal: document.getElementById("taskModal"),
        logoutBtn: document.getElementById("logoutBtn"),
        openAddTaskModalBtn: document.getElementById("openAddTaskModal"),
        closeModalBtn: document.getElementById("closeModal"),
        searchInput: document.getElementById("searchInput"),
        filterBtns: document.querySelectorAll(".filter-btn"),
        sortBySelect: document.getElementById("sortBy"),
        themeToggle: document.getElementById("themeToggle"),
        quickNotesInput: document.getElementById("quickNotesInput"),
        notesSaveStatus: document.getElementById("notesSaveStatus"),
        weatherCityInput: document.getElementById("weatherCityInput"),
        saveCityBtn: document.getElementById("saveCityBtn"),
        weatherContent: document.getElementById("weatherContent"),
        pomodoroDisplay: document.getElementById("pomodoroDisplay"),
        pomodoroStartBtn: document.getElementById("pomodoroStartBtn"),
        pomodoroPauseBtn: document.getElementById("pomodoroPauseBtn"),
        pomodoroResetBtn: document.getElementById("pomodoroResetBtn"),
        totalTasksCount: document.getElementById("totalTasksCount"),
        completedTasksCount: document.getElementById("completedTasksCount"),
        pendingTasksCount: document.getElementById("pendingTasksCount"),
        completionRate: document.getElementById("completionRate"),
    };

    if (ui.userNameDisplay) ui.userNameDisplay.textContent = loggedInUser.fullName;

    const showToast = (message, type = "info") => {
        const container = document.getElementById("toastContainer");
        if (!container) return;
        const toast = document.createElement("div");
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    };

    const apiRequest = async (path, options = {}) => {
        const response = await fetch(`${API_BASE}${path}`, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
                ...(options.headers || {}),
            },
        });

        const data = await response.json();
        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem("token");
                localStorage.removeItem("loggedInUser");
                window.location.href = "index.html";
            }
            throw new Error(data.message || "Request failed");
        }
        return data;
    };

    const applyTheme = (theme) => {
        document.body.classList.toggle("light-mode", theme === "light");
        ui.themeToggle.innerHTML = theme === "light" ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
        localStorage.setItem("theme", theme);
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60).toString().padStart(2, "0");
        const secs = (seconds % 60).toString().padStart(2, "0");
        return `${mins}:${secs}`;
    };

    const renderPomodoro = () => {
        ui.pomodoroDisplay.textContent = formatTime(state.profile.pomodoro.remainingSeconds);
    };

    const saveProfile = async (payload, silent = false) => {
        try {
            const data = await apiRequest("/auth/profile", {
                method: "PATCH",
                body: JSON.stringify(payload),
            });
            if (data.profile) {
                state.profile = {
                    ...state.profile,
                    ...data.profile,
                    preferences: { ...state.profile.preferences, ...(data.profile.preferences || {}) },
                    pomodoro: { ...state.profile.pomodoro, ...(data.profile.pomodoro || {}) },
                };
            }
        } catch (error) {
            if (!silent) showToast(error.message, "error");
        }
    };

    const fetchProfile = async () => {
        const data = await apiRequest("/auth/me");
        const profile = data.user || {};
        state.profile.quickNotes = profile.quickNotes || "";
        state.profile.preferences = {
            theme: profile.preferences?.theme || localStorage.getItem("theme") || "dark",
            weatherCity: profile.preferences?.weatherCity || "London",
        };
        state.profile.pomodoro = {
            duration: profile.pomodoro?.duration || 1500,
            remainingSeconds: profile.pomodoro?.remainingSeconds ?? (profile.pomodoro?.duration || 1500),
            isRunning: Boolean(profile.pomodoro?.isRunning),
            lastUpdatedAt: profile.pomodoro?.lastUpdatedAt || null,
        };
    };

    const fetchTasks = async () => {
        const data = await apiRequest("/tasks");
        state.tasks = data.tasks || [];
    };

    const updateStats = () => {
        const total = state.tasks.length;
        const completed = state.tasks.filter((task) => task.status === "completed").length;
        const pending = total - completed;
        const rate = total ? Math.round((completed / total) * 100) : 0;

        ui.totalTasksCount.textContent = total;
        ui.completedTasksCount.textContent = completed;
        ui.pendingTasksCount.textContent = pending;
        ui.completionRate.textContent = `${rate}%`;
    };

    const renderTasks = () => {
        let filteredTasks = state.tasks.filter((task) => {
            const description = task.description || "";
            const matchesSearch =
                task.title.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
                description.toLowerCase().includes(state.searchQuery.toLowerCase());

            if (state.currentFilter === "all") return matchesSearch;
            if (state.currentFilter === "completed") return matchesSearch && task.status === "completed";
            if (state.currentFilter === "pending") return matchesSearch && task.status === "pending";
            return matchesSearch;
        });

        if (state.sortOption === "newest") filteredTasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        if (state.sortOption === "oldest") filteredTasks.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        if (state.sortOption === "alphabetical") filteredTasks.sort((a, b) => a.title.localeCompare(b.title));

        ui.taskGrid.innerHTML = "";
        if (!filteredTasks.length) {
            ui.taskGrid.innerHTML = `
                <div class="empty-state glass-card">
                    <i class="fas fa-tasks"></i>
                    <h3>No tasks found</h3>
                    <p>${state.searchQuery ? "Try a different search term." : "Start by creating your first task."}</p>
                </div>
            `;
            updateStats();
            return;
        }

        filteredTasks.forEach((task) => {
            const card = document.createElement("div");
            card.className = "task-card";
            card.innerHTML = `
                <div class="task-head">
                    <h3 class="task-title">${task.title}</h3>
                    <span class="task-status-badge badge-${task.status}">${task.status}</span>
                </div>
                <p class="task-desc">${task.description || "No description provided"}</p>
                <div class="task-footer">
                    <span class="task-date"><i class="far fa-calendar-alt"></i> ${new Date(task.createdAt).toLocaleDateString()}</span>
                    <div class="task-actions">
                        <button class="action-btn complete-btn" onclick="toggleTaskStatus('${task._id}')" title="${task.status === "completed" ? "Mark Pending" : "Mark Completed"}">
                            <i class="fas ${task.status === "completed" ? "fa-undo" : "fa-check"}"></i>
                        </button>
                        <button class="action-btn edit-btn" onclick="openEditModal('${task._id}')" title="Edit Task">
                            <i class="fas fa-pen"></i>
                        </button>
                        <button class="action-btn delete-btn" onclick="deleteTask('${task._id}')" title="Delete Task">
                            <i class="fas fa-trash-can"></i>
                        </button>
                    </div>
                </div>
            `;
            ui.taskGrid.appendChild(card);
        });
        updateStats();
    };

    const fetchWeather = async () => {
        const city = state.profile.preferences.weatherCity || "London";
        ui.weatherContent.innerHTML = "<p>Loading weather...</p>";
        try {
            const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`);
            const geoData = await geoRes.json();
            if (!geoData.results || !geoData.results.length) throw new Error("City not found");
            const loc = geoData.results[0];
            const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current=temperature_2m,weather_code,wind_speed_10m`);
            const weatherData = await weatherRes.json();
            const current = weatherData.current;
            ui.weatherContent.innerHTML = `
                <p><strong>${loc.name}</strong>, ${loc.country || ""}</p>
                <p>Temperature: ${current.temperature_2m}°C</p>
                <p>Wind: ${current.wind_speed_10m} km/h</p>
                <p>Code: ${current.weather_code}</p>
            `;
        } catch (_error) {
            ui.weatherContent.innerHTML = "<p>Unable to load weather right now.</p>";
        }
    };

    const startPomodoro = async () => {
        if (pomodoroInterval) return;
        state.profile.pomodoro.isRunning = true;
        state.profile.pomodoro.lastUpdatedAt = new Date().toISOString();
        await saveProfile({ pomodoro: state.profile.pomodoro }, true);

        pomodoroInterval = setInterval(() => {
            if (state.profile.pomodoro.remainingSeconds <= 0) {
                clearInterval(pomodoroInterval);
                pomodoroInterval = null;
                state.profile.pomodoro.isRunning = false;
                showToast("Pomodoro complete!", "success");
                saveProfile({ pomodoro: state.profile.pomodoro }, true);
                return;
            }
            state.profile.pomodoro.remainingSeconds -= 1;
            renderPomodoro();
        }, 1000);
    };

    const pausePomodoro = async () => {
        state.profile.pomodoro.isRunning = false;
        if (pomodoroInterval) {
            clearInterval(pomodoroInterval);
            pomodoroInterval = null;
        }
        await saveProfile({ pomodoro: state.profile.pomodoro }, true);
    };

    const resetPomodoro = async () => {
        state.profile.pomodoro.isRunning = false;
        state.profile.pomodoro.remainingSeconds = state.profile.pomodoro.duration || 1500;
        if (pomodoroInterval) {
            clearInterval(pomodoroInterval);
            pomodoroInterval = null;
        }
        renderPomodoro();
        await saveProfile({ pomodoro: state.profile.pomodoro }, true);
    };

    window.deleteTask = async (id) => {
        if (!confirm("Are you sure you want to delete this task?")) return;
        try {
            await apiRequest(`/tasks/${id}`, { method: "DELETE" });
            await fetchTasks();
            renderTasks();
            showToast("Task deleted successfully", "info");
        } catch (error) {
            showToast(error.message, "error");
        }
    };

    window.toggleTaskStatus = async (id) => {
        try {
            const task = state.tasks.find((t) => t._id === id);
            if (!task) return;
            const nextStatus = task.status === "completed" ? "pending" : "completed";
            await apiRequest(`/tasks/${id}`, {
                method: "PUT",
                body: JSON.stringify({ status: nextStatus }),
            });
            await fetchTasks();
            renderTasks();
            showToast(`Task marked as ${nextStatus}`, "success");
        } catch (error) {
            showToast(error.message, "error");
        }
    };

    window.openEditModal = (id) => {
        const task = state.tasks.find((t) => t._id === id);
        if (!task) return;
        document.getElementById("taskId").value = task._id;
        document.getElementById("taskTitle").value = task.title;
        document.getElementById("taskDesc").value = task.description || "";
        document.getElementById("modalTitle").textContent = "Edit Task";
        document.getElementById("saveBtnText").textContent = "Update Task";
        ui.taskModal.classList.add("active");
    };

    ui.openAddTaskModalBtn.addEventListener("click", () => {
        ui.taskForm.reset();
        document.getElementById("taskId").value = "";
        document.getElementById("modalTitle").textContent = "Create New Task";
        document.getElementById("saveBtnText").textContent = "Add Task";
        ui.taskModal.classList.add("active");
    });

    ui.closeModalBtn.addEventListener("click", () => ui.taskModal.classList.remove("active"));
    window.addEventListener("click", (e) => {
        if (e.target === ui.taskModal) ui.taskModal.classList.remove("active");
    });

    ui.taskForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const id = document.getElementById("taskId").value;
        const title = document.getElementById("taskTitle").value.trim();
        const description = document.getElementById("taskDesc").value.trim();
        try {
            if (id) {
                await apiRequest(`/tasks/${id}`, { method: "PUT", body: JSON.stringify({ title, description }) });
                showToast("Task updated!", "success");
            } else {
                await apiRequest("/tasks", { method: "POST", body: JSON.stringify({ title, description }) });
                showToast("Task added successfully!", "success");
            }
            await fetchTasks();
            renderTasks();
            ui.taskModal.classList.remove("active");
        } catch (error) {
            showToast(error.message, "error");
        }
    });

    ui.searchInput.addEventListener("input", (e) => {
        state.searchQuery = e.target.value;
        renderTasks();
    });

    ui.filterBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
            ui.filterBtns.forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
            state.currentFilter = btn.dataset.filter;
            renderTasks();
        });
    });

    ui.sortBySelect.addEventListener("change", (e) => {
        state.sortOption = e.target.value;
        renderTasks();
    });

    ui.themeToggle.addEventListener("click", async () => {
        const nextTheme = state.profile.preferences.theme === "light" ? "dark" : "light";
        state.profile.preferences.theme = nextTheme;
        applyTheme(nextTheme);
        await saveProfile({ preferences: { theme: nextTheme } }, true);
    });

    ui.quickNotesInput.addEventListener("input", () => {
        state.profile.quickNotes = ui.quickNotesInput.value;
        ui.notesSaveStatus.textContent = "Saving...";
        if (notesSaveTimer) clearTimeout(notesSaveTimer);
        notesSaveTimer = setTimeout(async () => {
            await saveProfile({ quickNotes: state.profile.quickNotes }, true);
            ui.notesSaveStatus.textContent = "Saved";
        }, 600);
    });

    ui.saveCityBtn.addEventListener("click", async () => {
        const city = ui.weatherCityInput.value.trim();
        if (!city) return;
        state.profile.preferences.weatherCity = city;
        await saveProfile({ preferences: { weatherCity: city } }, true);
        fetchWeather();
        showToast("City updated", "success");
    });

    ui.pomodoroStartBtn.addEventListener("click", startPomodoro);
    ui.pomodoroPauseBtn.addEventListener("click", pausePomodoro);
    ui.pomodoroResetBtn.addEventListener("click", resetPomodoro);

    ui.logoutBtn.addEventListener("click", () => {
        localStorage.removeItem("token");
        localStorage.removeItem("loggedInUser");
        window.location.href = "index.html";
    });

    try {
        await Promise.all([fetchTasks(), fetchProfile()]);
        ui.quickNotesInput.value = state.profile.quickNotes;
        ui.weatherCityInput.value = state.profile.preferences.weatherCity;
        applyTheme(state.profile.preferences.theme || "dark");
        renderPomodoro();
        renderTasks();
        fetchWeather();
    } catch (error) {
        showToast(error.message, "error");
    }
});
